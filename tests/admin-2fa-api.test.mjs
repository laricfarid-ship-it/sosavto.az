import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import bcrypt from 'bcryptjs';

process.env.LOCAL_DATABASE='true';
process.env.LOCAL_DB_PATH='memory://';
process.env.APP_ORIGIN='http://localhost:4173';
process.env.ADMIN_2FA_ENCRYPTION_KEY='a'.repeat(64);
delete process.env.DATABASE_URL;
delete process.env.VERCEL;

const {database,query,close}=await import('../server/db.mjs');
const {hash}=await import('../server/security.mjs');
const {totp}=await import('../server/admin-2fa.mjs');
const {default:handler}=await import('../api/index.mjs');
const email='admin-2fa-test@example.test';
const password='test-admin-password';
let adminId;

before(async()=>{
 await (await database()).exec(await readFile(new URL('../server/schema.sql',import.meta.url),'utf8'));
 adminId=randomUUID();
 await query('INSERT INTO users(id,fullname,username,email,password_hash,role) VALUES($1,$2,$3,$4,$5,$6)',[adminId,'2FA Test Admin','admin_2fa_test',email,await bcrypt.hash(password,4),'admin']);
});
after(close);

async function request(path,{method='GET',data,cookie='',ip='192.0.2.50'}={}){
 const raw=data===undefined?'':JSON.stringify(data);
 const req=Readable.from([Buffer.from(raw)]);
 req.method=method;req.url=path;
 req.headers={'origin':process.env.APP_ORIGIN,'content-type':'application/json',...(cookie?{cookie}:{}),...(raw?{'content-length':String(Buffer.byteLength(raw))}:{})};
 req.socket={remoteAddress:ip};
 const output={headers:{}};
 const res={statusCode:200,setHeader:(k,v)=>output.headers[k.toLowerCase()]=v,end:value=>{output.body=JSON.parse(value);}};
 await handler(req,res);
 output.status=res.statusCode;
 return output;
}
function cookieFrom(response,name){const header=response.headers['set-cookie'];assert.ok(header,'Expected Set-Cookie');const match=String(header).match(new RegExp('(?:^|;\\s*)'+name+'=([^;]+)'));assert.ok(match,'Expected '+name+' cookie');return name+'='+match[1];}

test('admin 2FA enrollment encrypts the secret, requires password, challenges login and supports one-time recovery codes',async()=>{
 const login=await request('/api/login',{method:'POST',data:{identifier:email,password}});
 assert.equal(login.status,200);
 const sessionCookie=cookieFrom(login,'sosavto_session');

 const noPassword=await request('/api/admin/2fa/setup',{method:'POST',cookie:sessionCookie,data:{}});
 assert.equal(noPassword.status,401);

 const setup=await request('/api/admin/2fa/setup',{method:'POST',cookie:sessionCookie,data:{password}});
 assert.equal(setup.status,200);
 assert.match(setup.body.secret,/^[A-Z2-7]+$/);
 const stored=(await query('SELECT secret,enabled FROM admin_totp WHERE user_id=$1',[adminId])).rows[0];
 assert.equal(stored.enabled,false);
 assert.notEqual(stored.secret,setup.body.secret);
 assert.match(stored.secret,/^v1:/);

 const confirm=await request('/api/admin/2fa/confirm',{method:'POST',cookie:sessionCookie,data:{code:totp(setup.body.secret)}});
 assert.equal(confirm.status,200);
 assert.equal(confirm.body.enabled,true);
 assert.equal(confirm.body.backupCodes.length,10);
 const authenticatedCookie=cookieFrom(confirm,'sosavto_session');
 assert.notEqual(authenticatedCookie,sessionCookie);

 const passwordOnly=await request('/api/login',{method:'POST',data:{identifier:email,password},ip:'192.0.2.51'});
 assert.equal(passwordOnly.status,200);
 assert.equal(passwordOnly.body.requires2fa,true);
 const challenge=cookieFrom(passwordOnly,'sosavto_admin_challenge');
 const verified=await request('/api/admin/2fa/verify-login',{method:'POST',cookie:challenge,data:{code:totp(setup.body.secret)},ip:'192.0.2.51'});
 assert.equal(verified.status,200);
 assert.ok(cookieFrom(verified,'sosavto_session'));

 const backupLogin=await request('/api/login',{method:'POST',data:{identifier:email,password},ip:'192.0.2.52'});
 assert.equal(backupLogin.body.requires2fa,true);
 const backupChallenge=cookieFrom(backupLogin,'sosavto_admin_challenge');
 const backup=setup.body.backupCodes?.[0]||confirm.body.backupCodes[0];
 const recovered=await request('/api/admin/2fa/verify-login',{method:'POST',cookie:backupChallenge,data:{code:backup},ip:'192.0.2.52'});
 assert.equal(recovered.status,200);
 assert.ok(cookieFrom(recovered,'sosavto_session'));

 const retryLogin=await request('/api/login',{method:'POST',data:{identifier:email,password},ip:'192.0.2.53'});
 const retryChallenge=cookieFrom(retryLogin,'sosavto_admin_challenge');
 const reused=await request('/api/admin/2fa/verify-login',{method:'POST',cookie:retryChallenge,data:{code:backup},ip:'192.0.2.53'});
 assert.equal(reused.status,401);
});
