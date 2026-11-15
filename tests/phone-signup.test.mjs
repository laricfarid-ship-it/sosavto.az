import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {readFile} from 'node:fs/promises';
import {normalizeLoginPhone} from '../server/phone-identity.mjs';
process.env.LOCAL_DATABASE='true';process.env.LOCAL_DB_PATH='memory://';process.env.APP_ORIGIN='http://localhost:4173';delete process.env.DATABASE_URL;
const {database,query,close}=await import('../server/db.mjs');
const {default:handler}=await import('../api/index.mjs');
async function request(path,data){const req=Readable.from([JSON.stringify(data)]);req.url='/api'+path;req.method='POST';req.headers={'content-type':'application/json',origin:process.env.APP_ORIGIN};let body;const res={statusCode:200,setHeader(){},end:v=>body=JSON.parse(v)};await handler(req,res);return {status:res.statusCode,body};}
const password='Strong-password-123';
before(async()=>{await(await database()).exec(await readFile(new URL('../server/schema.sql',import.meta.url),'utf8'));});after(close);
test('phone numbers normalize consistently; foreign and malformed numbers fail',()=>{
 for(const value of ['050 123 45 67','+994 (50) 123-45-67','994501234567'])assert.equal(normalizeLoginPhone(value),'+994501234567');
 for(const value of ['+90501234567','phone','+99450123456','+994501234567x'])assert.equal(normalizeLoginPhone(value),'');
});
test('phone signup needs no email, preserves password authentication and rejects duplicates',async()=>{
 const created=await request('/register',{fullname:'Phone Owner',username:'phone_owner',registration_method:'phone',phone:'050 123 45 67',password});assert.equal(created.status,201);assert.equal(created.body.user.email,null);assert.equal(created.body.user.phone,'+994501234567');
 for(const identifier of ['0501234567','+994 50 123 45 67','phone_owner']){const login=await request('/login',{identifier,password});assert.equal(login.status,200);assert.equal(login.body.user.id,created.body.user.id);}
 assert.equal((await request('/login',{identifier:'0501234567',password:'incorrect-password'})).status,401);
 assert.equal((await request('/register',{fullname:'Duplicate',username:'phone_duplicate',phone:'+994501234567',password})).status,409);
});
test('profile contact numbers do not become login identities; email accounts still work',async()=>{
 const created=await request('/register',{fullname:'Email Owner',username:'email_owner',email:'email-owner@example.test',password});assert.equal(created.status,201);
 await query('UPDATE users SET phone=$1 WHERE id=$2',['+994551234567',created.body.user.id]);
 assert.equal((await request('/login',{identifier:'+994551234567',password})).status,401);
 assert.equal((await request('/login',{identifier:'email-owner@example.test',password})).status,200);
});
test('phone migration is repeatable and preserves legacy email identities',async()=>{
 const sql=await readFile(new URL('../server/phone-signup-schema.sql',import.meta.url),'utf8');await (await database()).exec(sql);await (await database()).exec(sql);
 assert.equal((await query("SELECT count(*)::int AS n FROM users WHERE email='email-owner@example.test'")).rows[0].n,1);
 assert.equal((await query('SELECT count(*)::int AS n FROM login_phones')).rows[0].n,1);
});
test('legacy schema migration retains users and permits independent phone-only identities',async()=>{
 const {PGlite}=await import('@electric-sql/pglite');const db=new PGlite('memory://');
 try{await db.exec("CREATE TABLE users(id uuid PRIMARY KEY,email text NOT NULL UNIQUE,password_hash text NOT NULL); INSERT INTO users VALUES('11111111-1111-4111-8111-111111111111','legacy@example.test','original-hash');");
 const sql=await readFile(new URL('../server/phone-signup-schema.sql',import.meta.url),'utf8');await db.exec(sql);await db.exec(sql);
 assert.equal((await db.query('SELECT password_hash FROM users')).rows[0].password_hash,'original-hash');
 await db.query("INSERT INTO users VALUES('22222222-2222-4222-8222-222222222222',null,'phone-hash')");
 await db.query("INSERT INTO login_phones VALUES('22222222-2222-4222-8222-222222222222','+994501234567')");
 assert.equal((await db.query('SELECT count(*)::int AS n FROM users')).rows[0].n,2);
 }finally{await db.close();}
});
