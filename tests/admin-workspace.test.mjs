import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
process.env.LOCAL_DATABASE='true';process.env.LOCAL_DB_PATH='memory://';process.env.APP_ORIGIN='http://localhost:4173';
delete process.env.DATABASE_URL;delete process.env.VERCEL;
const {database,query,close}=await import('../server/db.mjs');
const {createSession}=await import('../server/security.mjs');
const {default:handler}=await import('../api/index.mjs');
let adminCookie,userCookie,userId;
async function request(path,method='GET',data,cookie=adminCookie){
 const raw=data?JSON.stringify(data):'';const req=Readable.from([Buffer.from(raw)]);req.method=method;req.url=path;req.socket={remoteAddress:'192.0.2.80'};req.headers={origin:process.env.APP_ORIGIN,cookie,'content-type':'application/json',...(raw?{'content-length':String(Buffer.byteLength(raw))}:{})};
 const out={};const res={statusCode:200,setHeader(){},end(v){out.body=JSON.parse(v)}};await handler(req,res);out.status=res.statusCode;return out;
}
before(async()=>{await(await database()).exec(await readFile(new URL('../server/schema.sql',import.meta.url),'utf8'));for(const role of ['admin','user']){const id=randomUUID();await query('INSERT INTO users(id,fullname,username,email,password_hash,role) VALUES($1,$2,$3,$4,$5,$6)',[id,role,role,role+'@example.test','unused',role]);let cookie=(await createSession({setHeader(){}},{id})).split(';')[0];if(role==='admin')adminCookie=cookie;else {userCookie=cookie;userId=id}}});after(close);
test('restored operational endpoints enforce admin authorization',async()=>{for(const path of ['finance','operations','workspace','social-listings']){assert.equal((await request('/api/admin/'+path,'GET',null,'')).status,401);assert.equal((await request('/api/admin/'+path,'GET',null,userCookie)).status,403)}});
test('finance persists decimal amounts, reports totals and audits deletion',async()=>{let r=await request('/api/admin/finance','POST',{kind:'income',date:'2026-11-12',category:'VIP',description:'round trip',amount:19.99});assert.equal(r.status,201);const id=r.body.id;r=await request('/api/admin/finance');assert.equal(r.body.entries[0].amount_cents,'1999');assert.equal(r.body.totals.income_cents,'1999');assert.equal((await request('/api/admin/finance','DELETE',{id})).status,200);assert.equal((await query("SELECT count(*)::integer n FROM audit_logs WHERE entity_id=$1",[id])).rows[0].n,2)});
test('business approval and Android releases survive subsequent reads',async()=>{assert.equal((await request('/api/admin/operations','POST',{kind:'business',user_id:userId,name:'Test Servis',business_type:'Servis',status:'approved'})).status,201);assert.equal((await request('/api/admin/operations','POST',{kind:'android',version_name:'1.2',version_code:12,release_notes:'Test',channel:'internal',apk_url:'https://example.test/app.apk'})).status,201);const r=await request('/api/admin/operations');assert.equal(r.body.business[0].status,'approved');assert.equal(r.body.android[0].version_code,12);assert.deepEqual(r.body.unavailable,[])});
test('optional service tables do not break the admin workspace',async()=>{const r=await request('/api/admin/workspace');assert.equal(r.status,200);assert.ok(Array.isArray(r.body.unavailable));assert.equal((await request('/api/admin/social-listings')).status,200)});
test('restoration migration is additive and repeatable',async()=>{await import('../server/admin-workspace-migrate.mjs');await import('../server/admin-workspace-migrate.mjs?repeat');assert.equal((await request('/api/admin/operations')).body.business.length,1)});
