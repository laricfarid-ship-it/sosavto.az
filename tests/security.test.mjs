import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {readFile} from 'node:fs/promises';
import {randomUUID,randomBytes} from 'node:crypto';
process.env.LOCAL_DATABASE='true';process.env.LOCAL_DB_PATH='memory://';process.env.APP_ORIGIN='http://localhost:4173';
delete process.env.DATABASE_URL;delete process.env.VERCEL;
const {database,query,close}=await import('../server/db.mjs');
const {body,clientAddress,hash,rateLimit}=await import('../server/security.mjs');
const {washQuote}=await import('../server/wash.mjs');
const {default:handler}=await import('../api/index.mjs');
let cookie;
before(async()=>{
 await (await database()).exec(await readFile(new URL('../server/schema.sql',import.meta.url),'utf8'));
 const id=randomUUID(),token=randomBytes(32).toString('hex');
 await query("INSERT INTO users(id,fullname,username,email,password_hash) VALUES($1,'Security Test','security_test','security@example.test','unused')",[id]);
 await query("INSERT INTO sessions VALUES($1,$2,now()+interval '1 hour')",[hash(token),id]);cookie='sosavto_session='+token;
});
after(close);
function input(raw='',url='/api/login',headers={}){const req=Readable.from([Buffer.from(raw)]);req.method='POST';req.url=url;req.headers={'content-type':'application/json',origin:process.env.APP_ORIGIN,...headers};req.socket={remoteAddress:'192.0.2.10'};return req;}
async function request(path,{method='GET',raw='',headers={},ip='192.0.2.10'}={}){
 const req=input(raw,'/api'+path,headers);req.method=method;req.socket.remoteAddress=ip;
 const output={headers:{}};const res={statusCode:200,setHeader:(k,v)=>output.headers[k.toLowerCase()]=v,end:v=>output.body=JSON.parse(v)};
 await handler(req,res);output.status=res.statusCode;return output;
}
test('JSON rejects null, arrays, scalars and broken input as client errors',async()=>{
 for(const raw of ['null','[]','"text"','true','123','{'])assert.equal((await request('/login',{method:'POST',raw})).status,400,raw);
});
test('body supports Vercel parsed objects, strings and buffers without ignoring data',async()=>{
 for(const value of [{message:'Salam'},'{"message":"Salam"}',Buffer.from('{"message":"Salam"}')]){const req=input();req.body=value;assert.deepEqual(await body(req),{message:'Salam'});}
 for(const value of [null,[],true]){const req=input();req.body=value;await assert.rejects(body(req),e=>e.status===400);}
});
test('body limits apply to streams, parsed bodies and content-length; uploads retain their larger limit',async()=>{
 const raw=JSON.stringify({message:'a'.repeat(66000)});
 for(const req of [input(raw),Object.assign(input(),{body:JSON.parse(raw)}),Object.assign(input(),{body:raw}),input('{}','/api/login',{'content-length':'66000'})])await assert.rejects(body(req),e=>e.status===413);
 assert.equal((await body(input(raw,'/api/uploads'))).message.length,66000);
 await assert.rejects(body(input(JSON.stringify({data:'a'.repeat(4500001)}),'/api/uploads')),e=>e.status===413);
 const bytes=Buffer.from('{"message":"Azərbaycan"}');const req=Readable.from([...bytes].map(x=>Buffer.from([x])));req.url='/api/login';req.headers={};assert.equal((await body(req)).message,'Azərbaycan');
});
test('direct requests cannot spoof their address using forwarding headers',()=>{
 const req=input('',undefined,{'x-forwarded-for':'203.0.113.1','x-vercel-forwarded-for':'203.0.113.2'});
 assert.equal(clientAddress(req),'192.0.2.10');
});
test('Vercel trusts only its platform header and IPv6 interface rotation shares a bucket',()=>{
 process.env.VERCEL='1';
 try{
  assert.equal(clientAddress(input('',undefined,{'x-forwarded-for':'203.0.113.1'})),'unknown');
  assert.equal(clientAddress(input('',undefined,{'x-vercel-forwarded-for':'203.0.113.2'})),'203.0.113.2');
  assert.equal(clientAddress(input('',undefined,{'x-vercel-forwarded-for':'not-an-ip'})),'unknown');
  assert.equal(clientAddress(input('',undefined,{'x-vercel-forwarded-for':'::ffff:192.0.2.1'})),'192.0.2.1');
  const a=clientAddress(input('',undefined,{'x-vercel-forwarded-for':'2001:db8:0:1::1'}));
  assert.equal(a,clientAddress(input('',undefined,{'x-vercel-forwarded-for':'2001:0db8:0000:0001:ffff::2'})));
 }finally{delete process.env.VERCEL;}
});
test('shared limiter expires correctly and returns retry information',async()=>{
 await rateLimit('security-expiry',1,60);await assert.rejects(rateLimit('security-expiry',1,60),e=>e.status===429&&e.retryAfter>0);
 await query("UPDATE rate_limits SET expires_at=now()-interval '1 second' WHERE key=$1",[hash('security-expiry')]);await rateLimit('security-expiry',1,60);
});
test('IP throttle stops rotating login identifiers before password work',async()=>{
 const ip='192.0.2.20';await query("INSERT INTO rate_limits VALUES($1,60,now()+interval '15 minutes')",[hash('auth:ip:'+ip)]);
 const r=await request('/login',{method:'POST',ip,raw:JSON.stringify({identifier:'new-identifier@example.test',password:'long-enough-password'})});
 assert.equal(r.status,429);assert.ok(Number(r.headers['retry-after'])>0);
 assert.equal((await query('SELECT * FROM rate_limits WHERE key=$1',[hash('auth:new-identifier@example.test')])).rows.length,0);
});
test('registration, public API and authenticated writes each enforce their shared budgets',async()=>{
 const ip='192.0.2.30';await query("INSERT INTO rate_limits VALUES($1,10,now()+interval '1 hour')",[hash('register:ip:'+ip)]);
 assert.equal((await request('/register',{method:'POST',ip,raw:'{}'})).status,429);
 await query("INSERT INTO rate_limits VALUES($1,300,now()+interval '1 minute')",[hash('api:ip:192.0.2.31')]);
 assert.equal((await request('/listings',{ip:'192.0.2.31'})).status,429);
 const u=(await query("SELECT id FROM users WHERE username='security_test'")).rows[0];await query("INSERT INTO rate_limits VALUES($1,120,now()+interval '1 minute')",[hash('write:'+u.id)]);
 assert.equal((await request('/me',{method:'PATCH',raw:'{}',headers:{cookie}})).status,429);
 await query('DELETE FROM rate_limits WHERE key=$1',[hash('write:'+u.id)]);
});
test('admin endpoints reject unauthenticated and ordinary accounts; forged role headers do not help',async()=>{
 assert.equal((await request('/admin')).status,401);
 assert.equal((await request('/admin',{headers:{cookie,'x-role':'admin'}})).status,403);
 for(const path of ['/admin/moderate','/admin/user','/admin/report'])assert.equal((await request(path,{method:'POST',raw:'{}',headers:{cookie}})).status,403);
});
test('missing origin, foreign origin and non-JSON mutations fail closed',async()=>{
 for(const origin of ['', 'https://evil.example'])assert.equal((await request('/me',{method:'PATCH',raw:'{}',headers:{cookie,origin}})).status,403);
 assert.equal((await request('/me',{method:'PATCH',raw:'{}',headers:{cookie,'content-type':'text/plain'}})).status,415);
});
test('inherited sort names and fractional page numbers cannot break database queries',async()=>{
 for(const sort of ['constructor','__proto__','toString'])assert.equal((await request('/listings?sort='+sort+'&page=1.5')).status,200);
});
test('inherited vehicle and service names cannot enter wash quotes',()=>{
 const catalog={exterior:{standard:1000,suv:1500,minutes:30}};
 for(const size of ['constructor','__proto__','toString'])assert.throws(()=>washQuote(catalog,size,['exterior']),e=>e.status===400);
 for(const key of ['constructor','__proto__','toString'])assert.throws(()=>washQuote(catalog,'standard',['exterior',key]),e=>e.status===400);
});
test('an SVG disguised with an allowed MIME prefix is rejected',async()=>{
 const data='data:image/png;base64,'+Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2"/></svg>').toString('base64');
 assert.equal((await request('/uploads',{method:'POST',headers:{cookie},raw:JSON.stringify({data})})).status,400);
});
