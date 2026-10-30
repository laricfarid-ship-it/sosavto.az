import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {readFile} from 'node:fs/promises';
import {randomBytes,randomUUID,createECDH} from 'node:crypto';
import webpush from 'web-push';
import bcrypt from 'bcryptjs';
process.env.LOCAL_DATABASE='true';process.env.LOCAL_DB_PATH='memory://';process.env.APP_ORIGIN='http://localhost:4173';
delete process.env.DATABASE_URL;delete process.env.VERCEL;
const keys=webpush.generateVAPIDKeys();process.env.PUSH_VAPID_PUBLIC_KEY=keys.publicKey;process.env.PUSH_VAPID_PRIVATE_KEY=keys.privateKey;
const {database,query,close}=await import('../server/db.mjs');
const {hash}=await import('../server/security.mjs');
const {validateSubscription,deliverPush}=await import('../server/admin-push.mjs');
const {default:handler}=await import('../api/index.mjs');
let admin,member;const sent=[];const originalSend=webpush.sendNotification;
function sub(suffix='device'){const e=createECDH('prime256v1');e.generateKeys();return {endpoint:'https://fcm.googleapis.com/fcm/send/'+suffix,keys:{p256dh:e.getPublicKey().toString('base64url'),auth:randomBytes(16).toString('base64url')}};}
async function user(role){const id=randomUUID(),token=randomBytes(32).toString('hex');await query('INSERT INTO users(id,fullname,username,email,password_hash,role) VALUES($1,$2,$3,$4,$5,$6)',[id,role+' Test',role,role+'@example.test',await bcrypt.hash('Test-password-123',4),role]);await query("INSERT INTO sessions VALUES($1,$2,now()+interval '1 day')",[hash(token),id]);return {id,cookie:'sosavto_session='+token};}
async function request(path,{method='GET',data,cookie='',origin=process.env.APP_ORIGIN}={}){const raw=JSON.stringify(data||{}),req=Readable.from([Buffer.from(raw)]);req.url='/api'+path;req.method=method;req.socket={remoteAddress:'192.0.2.89'};req.headers={cookie,origin,'content-type':'application/json'};const output={};const res={statusCode:200,setHeader(){},end(v){output.body=JSON.parse(v);}};await handler(req,res);return {...output,status:res.statusCode};}
before(async()=>{await(await database()).exec(await readFile(new URL('../server/schema.sql',import.meta.url),'utf8'));admin=await user('admin');member=await user('user');webpush.sendNotification=async(s,p,o)=>{sent.push({sub:s,payload:JSON.parse(p),options:o});return {statusCode:201};};});
after(async()=>{webpush.sendNotification=originalSend;await close();});
test('only authenticated admins can configure push; foreign origins rejected',async()=>{assert.equal((await request('/admin/push')).status,401);assert.equal((await request('/admin/push',{cookie:member.cookie})).status,403);assert.equal((await request('/admin/push',{cookie:admin.cookie,method:'POST',data:{subscription:sub()},origin:'https://evil.test'})).status,403);const r=await request('/admin/push',{cookie:admin.cookie});assert.equal(r.body.publicKey,keys.publicKey);assert.equal(JSON.stringify(r.body).includes(keys.privateKey),false);});
test('subscription rejects internal URLs, lookalike hosts and malformed keys',()=>{for(const endpoint of ['http://fcm.googleapis.com/test','https://127.0.0.1/test','https://fcm.googleapis.com.evil.test/test','https://web.push.apple.com:8443/test','https://foo.test/push'])assert.throws(()=>validateSubscription({...sub(),endpoint}));assert.throws(()=>validateSubscription({...sub(),keys:{auth:'a',p256dh:'x'}}));});
test('admin subscription upserts, tests only this device and can be removed',async()=>{const s=sub();for(let i=0;i<2;i++)assert.equal((await request('/admin/push',{cookie:admin.cookie,method:'POST',data:{subscription:s}})).status,200);assert.equal((await query('SELECT count(*)::integer n FROM admin_push_subscriptions')).rows[0].n,1);const second=sub('second');await request('/admin/push',{cookie:admin.cookie,method:'POST',data:{subscription:second}});const before=sent.length;const result=await request('/admin/push',{cookie:admin.cookie,method:'PUT',data:{endpoint:s.endpoint}});assert.equal(result.body.sent,1);assert.equal(sent.length,before+1);assert.equal(sent.at(-1).sub.endpoint,s.endpoint);assert.equal((await request('/admin/push',{cookie:admin.cookie,method:'DELETE',data:{endpoint:second.endpoint}})).status,200);});
test('committed listing, registration and successful login produce admin push; failed operations do not',async()=>{
 const ad={category:'car',title:'Hyundai Elantra test',description:'Test üçün elan məlumatları tam yazılıb.',price:20000,city:'Bakı',brand:'Hyundai',model:'Elantra',year:2018,mileage:50000,phone:'0501234567',imageIds:[],details:{}};
 const before=sent.length;
 assert.equal((await request('/listings',{cookie:member.cookie,method:'POST',data:{...ad,imageIds:[randomUUID()]}})).status,400);assert.equal(sent.length,before,'rolled back upload has no notification');
 const r=await request('/listings',{cookie:member.cookie,method:'POST',data:ad});assert.equal(r.status,201);assert.equal(sent.at(-1).payload.url,'/admin.html?listing='+r.body.id);assert.equal((await query('SELECT status FROM listings WHERE id=$1',[r.body.id])).rows[0].status,'pending');
 const registration=await request('/register',{method:'POST',data:{email:'new@example.test',username:'new_user',fullname:'New Person',password:'Test-password-123'}});assert.equal(registration.status,201);assert.match(sent.at(-1).payload.title,/qeydiyyatdan/);
 const count=sent.length;assert.equal((await request('/login',{method:'POST',data:{identifier:'new_user',password:'Wrong-password-123'}})).status,401);assert.equal(sent.length,count);
 assert.equal((await request('/login',{method:'POST',data:{identifier:'new_user',password:'Test-password-123'}})).status,200);assert.match(sent.at(-1).payload.title,/daxil/);
 webpush.sendNotification=async()=>{throw Object.assign(Error('unavailable'),{statusCode:503});};assert.equal((await request('/listings',{cookie:member.cookie,method:'POST',data:ad})).status,201,'push outage does not break listing creation');assert.ok((await query('SELECT body FROM notifications WHERE user_id=$1',[admin.id])).rows.length>=4);
});
test('expired subscriptions removed while transient failures retained',async()=>{const rows=(await query('SELECT * FROM admin_push_subscriptions')).rows;const result=await deliverPush(rows,{},async()=>{throw Object.assign(Error('temporary'),{statusCode:503});});assert.equal(result.failed,rows.length);assert.equal((await query('SELECT * FROM admin_push_subscriptions')).rows.length,rows.length);await deliverPush(rows,{},async()=>{throw Object.assign(Error('gone'),{statusCode:410});});assert.equal((await query('SELECT * FROM admin_push_subscriptions')).rows.length,0);});
