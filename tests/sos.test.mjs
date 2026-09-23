import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Readable} from 'node:stream';
import {readFile} from 'node:fs/promises';
process.env.LOCAL_DATABASE='true';process.env.LOCAL_DB_PATH='memory://';process.env.APP_ORIGIN='http://localhost:4173';process.env.SOS_ENABLED='true';delete process.env.DATABASE_URL;
const {database,query,close}=await import('../server/db.mjs');
const {hash}=await import('../server/security.mjs');
const {default:handler}=await import('../api/index.mjs');
async function call(path,{user,method='GET',data,origin=process.env.APP_ORIGIN}={}){
 const req=Readable.from(data===undefined?[]:[JSON.stringify(data)]);req.url='/api/sos'+path;req.method=method;req.headers={'content-type':'application/json',origin,...(user?{cookie:user.cookie}:{})};let value;const res={statusCode:200,setHeader(){},end(v){value=JSON.parse(v);}};await handler(req,res);return {status:res.statusCode,...value};
}
const post=(path,user,data={})=>call(path,{user,data,method:'POST'});
async function account(name,role='user'){
 const id=randomUUID(),token=randomUUID().replaceAll('-','').repeat(2);
 await query('INSERT INTO users(id,fullname,username,email,password_hash,role) VALUES($1,$2,$2,$3,$4,$5)',[id,name,name+'@example.test','unused',role]);
 await query("INSERT INTO sessions VALUES($1,$2,now()+interval '1 day')",[hash(token),id]);return {id,cookie:'sosavto_session='+token};
}
let driver,other,m1,m2,admin;
const data=()=>({client_key:randomUUID(),problem:'tire',latitude:40.4,longitude:49.8,address:'Bakı, test küçəsi',phone:'+994501234567',note:'Test avtomobili'});
const quote={arrival_fee:10,labor_fee:15,parts_fee:0,eta_minutes:20};
async function master(user){assert.equal((await post('/master',user,{phone:'+994501234567',specialties:['tire']})).status,200);assert.equal((await post('/admin/masters',admin,{id:user.id,approval:'approved'})).status,200);assert.equal((await post('/presence',user,{online:true,latitude:40.401,longitude:49.801})).status,200);}
before(async()=>{const d=await database();await d.exec(await readFile(new URL('../server/schema.sql',import.meta.url),'utf8'));await d.exec(await readFile(new URL('../server/sos-schema.sql',import.meta.url),'utf8'));driver=await account('driver');other=await account('other');m1=await account('master1');m2=await account('master2');admin=await account('administrator','admin');});
after(close);
test('disabled feature, login and CSRF gates',async()=>{
 process.env.SOS_ENABLED='false';assert.equal((await call('/requests',{user:driver})).status,404);process.env.SOS_ENABLED='true';assert.equal((await call('/requests')).status,401);
 assert.equal((await call('/requests',{user:driver,method:'POST',data:data(),origin:'https://evil.test'})).status,403);
 assert.equal((await post('/admin/masters',driver,{id:driver.id,approval:'approved'})).status,403);
});
test('unapproved masters cannot go online; approval is server controlled',async()=>{
 assert.equal((await post('/master',m1,{phone:'+994501234567',specialties:['tire'],approval:'approved'})).status,200);
 assert.equal((await post('/presence',m1,{online:true,latitude:40.4,longitude:49.8})).status,403);
 await master(m1);await master(m2);
});
test('invalid requests and locations are rejected',async()=>{
 for(const change of [{latitude:200},{longitude:null},{problem:'fake'},{phone:'abcdefghi'},{client_key:'bad'},{address:''}])assert.equal((await post('/requests',driver,{...data(),...change})).status,400);
});
let id;
test('persistent dispatch, duplicate-safe creation and private inbox',async()=>{
 const input=data(),r=await post('/requests',driver,input);assert.equal(r.status,200,JSON.stringify(r));id=r.request.id;
 assert.equal((await post('/requests',driver,input)).request.id,id);
 assert.equal((await post('/requests',driver,data())).status,409);
 const inbox=await call('/inbox',{user:m1});assert.equal(inbox.dispatches[0].id,id);for(const key of ['phone','latitude','longitude','address','driver_id'])assert.equal(inbox.dispatches[0][key],undefined);
 assert.equal((await call('/requests/'+id,{user:other})).status,404);
 assert.equal((await call('/requests/'+id,{user:m1})).status,404);
 assert.equal((await post('/requests/'+id+'/accept',other,quote)).status,404);
});
test('acceptance requires valid quote; one request has exactly one winner',async()=>{
 assert.equal((await post('/requests/'+id+'/accept',m1,{...quote,arrival_fee:-1})).status,400);
 const attempts=await Promise.all([post('/requests/'+id+'/accept',m1,quote),post('/requests/'+id+'/accept',m2,quote)]);
 assert.deepEqual(attempts.map(r=>r.status).sort(),[200,409]);const r=(await call('/requests/'+id,{user:driver})).request;assert.equal(r.status,'offered');assert.equal(r.master.phone,undefined);assert.equal(r.eta_minutes,20);assert.equal(r.master.location,undefined);
 if(r.master_id===m2.id)[m1,m2]=[m2,m1];
 const view=(await call('/requests/'+id,{user:m1})).request;assert.equal(view.phone,undefined);assert.equal(view.latitude,undefined);
 assert.equal((await post('/requests/'+id+'/accept',m1,quote)).status,200,'retry is idempotent');
});
test('driver confirms quote; unauthorized/out-of-order transitions fail',async()=>{
 assert.equal((await post('/requests/'+id+'/arrive',m1)).status,409);
 assert.equal((await post('/requests/'+id+'/confirm',m1)).status,403);
 assert.equal((await post('/requests/'+id+'/confirm',driver)).request.status,'en_route');
 const r=(await call('/requests/'+id,{user:m1})).request;assert.equal(r.phone,'+994501234567');assert.equal(r.latitude,40.4);
 assert.equal((await post('/requests/'+id+'/complete',driver)).status,409);
 assert.equal((await post('/requests/'+id+'/arrive',m2)).status,404);
 assert.equal((await post('/requests/'+id+'/arrive',m1)).request.status,'arrived');
 assert.equal((await post('/requests/'+id+'/complete',m1)).status,403);
 assert.equal((await post('/requests/'+id+'/complete',driver)).request.status,'completed');
 assert.equal((await post('/requests/'+id+'/cancel',driver,{reason:'Too late'})).status,409);
});
test('reviews require completed ownership and persist once',async()=>{
 assert.equal((await post('/requests/'+id+'/review',other,{rating:5})).status,404);
 assert.equal((await post('/requests/'+id+'/review',driver,{rating:2.5})).status,400);
 assert.equal((await post('/requests/'+id+'/review',driver,{rating:5,comment:'Yaxşı xidmət'})).status,200);
 await post('/requests/'+id+'/review',driver,{rating:1});const r=(await call('/requests/'+id,{user:driver})).request;assert.equal(r.review.rating,5);assert.equal(Number(r.master.rating),5);assert.equal(r.events.length,5);
});
test('expired offers release driver and master, stale GPS excluded',async()=>{
 const r=await post('/requests',driver,data());await post('/requests/'+r.request.id+'/accept',m1,quote);
 await query("UPDATE sos_requests SET expires_at=now()-interval '1 second' WHERE id=$1",[r.request.id]);
 assert.equal((await post('/requests/'+r.request.id+'/confirm',driver)).status,409);
 assert.equal((await call('/requests/'+r.request.id,{user:driver})).request.status,'expired');
 const privateExpired=(await call('/requests/'+r.request.id,{user:m1})).request;assert.equal(privateExpired.phone,undefined);assert.equal(privateExpired.latitude,undefined);
 await query("UPDATE sos_masters SET location_at=now()-interval '2 minutes'");
 const next=await post('/requests',driver,data());assert.equal((await call('/inbox',{user:m1})).dispatches.length,0);
 assert.equal((await query('SELECT * FROM sos_dispatches WHERE request_id=$1',[next.request.id])).rows.length,0);
 await post('/presence',m1,{online:true,latitude:40.4,longitude:49.8});assert.equal((await call('/inbox',{user:m1})).dispatches[0].id,next.request.id,'newly online master gets open request');
 assert.equal((await post('/requests/'+next.request.id+'/cancel',driver,{reason:'Özüm həll etdim'})).request.status,'cancelled');
 assert.equal((await post('/requests/'+next.request.id+'/accept',m1,quote)).status,409);
});
test('one master cannot accept multiple requests, declines remain closed',async()=>{
 await post('/presence',m2,{online:true,latitude:40.4,longitude:49.8});
 const a=(await post('/requests',driver,data())).request,b=(await post('/requests',other,data())).request;
 await post('/requests/'+a.id+'/decline',m2);await post('/presence',m2,{online:true,latitude:40.4,longitude:49.8});
 assert.ok(!(await call('/inbox',{user:m2})).dispatches.some(d=>d.id===a.id));
 const attempts=await Promise.all([post('/requests/'+a.id+'/accept',m1,quote),post('/requests/'+b.id+'/accept',m1,quote)]);assert.deepEqual(attempts.map(r=>r.status).sort(),[200,409]);
 await post('/requests/'+a.id+'/cancel',driver,{reason:'Test bitdi'});await post('/requests/'+b.id+'/cancel',other,{reason:'Test bitdi'});
});
test('radius, specialty, offline and bans exclude unavailable masters',async()=>{
 await post('/presence',m1,{online:true,latitude:41.4,longitude:49.8});await post('/presence',m2,{online:false});
 const r=(await post('/requests',driver,data())).request;assert.equal((await query('SELECT * FROM sos_dispatches WHERE request_id=$1',[r.id])).rows.length,0);
 await post('/requests/'+r.id+'/cancel',driver,{reason:'Test bitdi'});
 await query("UPDATE sos_masters SET online=true,latitude=40.4,location_at=now()");await query("UPDATE users SET status='banned' WHERE id=$1",[m1.id]);await query("UPDATE sos_masters SET specialties=ARRAY['fuel'] WHERE user_id=$1",[m2.id]);
 const s=(await post('/requests',driver,data())).request;assert.equal((await query('SELECT * FROM sos_dispatches WHERE request_id=$1',[s.id])).rows.length,0);
 assert.equal((await call('/inbox',{user:m1})).status,401);
 await post('/requests/'+s.id+'/cancel',driver,{reason:'Test bitdi'});
});
