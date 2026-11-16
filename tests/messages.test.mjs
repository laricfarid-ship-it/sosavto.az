import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Readable} from 'node:stream';
import {randomUUID} from 'node:crypto';
process.env.LOCAL_DATABASE='true';process.env.LOCAL_DB_PATH='memory://';process.env.APP_ORIGIN='http://localhost:4173';delete process.env.DATABASE_URL;
const {database,query,close}=await import('../server/db.mjs');
const {default:handler}=await import('../api/index.mjs');
const password='Strong-password-123';let buyer,seller,other,admin,listing,conversation;
async function request(path,method='GET',data,cookie=''){
 const req=Readable.from(data?[JSON.stringify(data)]:[]);req.url='/api'+path;req.method=method;req.headers={'content-type':'application/json',origin:process.env.APP_ORIGIN,cookie};let body;const headers={};const res={statusCode:200,setHeader:(k,v)=>headers[k]=v,end:v=>body=JSON.parse(v)};await handler(req,res);return {status:res.statusCode,body,cookie:headers['Set-Cookie']?.split(';')[0]};
}
async function register(name){const r=await request('/register','POST',{fullname:name,username:name,email:name+'@example.test',password});assert.equal(r.status,201);return {id:r.body.user.id,cookie:r.cookie};}
before(async()=>{await(await database()).exec(await readFile(new URL('../server/schema.sql',import.meta.url),'utf8'));buyer=await register('buyer');seller=await register('seller');other=await register('other');admin=await register('admin');await query("UPDATE users SET role='admin' WHERE id=$1",[admin.id]);listing=randomUUID();await query("INSERT INTO listings(id,user_id,category,title,description,price,city,phone,status) VALUES($1,$2,'car','Test car','Description',100,'Bakı','0501234567','active')",[listing,seller.id]);});after(close);
test('business login rejects individual credentials without issuing a session',async()=>{
 const rejected=await request('/login','POST',{identifier:'buyer',password,login_mode:'business'});assert.equal(rejected.status,403);assert.equal(rejected.cookie,undefined);
 await query("INSERT INTO admin_business_profiles(user_id,business_name,business_type) VALUES($1,'Seller Business','service')",[seller.id]);assert.equal((await request('/login','POST',{identifier:'seller',password,login_mode:'business'})).status,200);
 assert.equal((await request('/login','POST',{identifier:'buyer',password})).status,200);
});
test('starting a listing conversation requires authentication and reuses the same thread',async()=>{
 assert.equal((await request('/conversations','POST',{listing_id:listing})).status,401);
 assert.equal((await request('/conversations','POST',{listing_id:listing},seller.cookie)).status,400);
 const r=await request('/conversations','POST',{listing_id:listing},buyer.cookie);assert.equal(r.status,200);conversation=r.body.conversation.id;
 assert.equal((await request('/conversations','POST',{listing_id:listing},buyer.cookie)).body.conversation.id,conversation);
});
test('messages persist across sessions, remain text, and are private to participants',async()=>{
 const path='/conversations/'+conversation+'/messages';
 assert.equal((await request(path,'POST',{message:' <script>alert(1)</script> '},buyer.cookie)).status,200);
 assert.equal((await request(path,'POST',{message:'Salam'},seller.cookie)).status,200);
 const login=await request('/login','POST',{identifier:'buyer',password});const rows=(await request(path,'GET',null,login.cookie)).body.messages;assert.equal(rows.length,2);assert.equal(rows[0].body,'<script>alert(1)</script>');
 for(const u of [other,admin]){assert.equal((await request(path,'GET',null,u.cookie)).status,404);assert.equal((await request(path,'POST',{message:'intrusion'},u.cookie)).status,404);assert.equal((await request('/conversations','GET',null,u.cookie)).body.conversations.length,0);}
 for(const message of ['', ' '.repeat(10),'a'.repeat(2001)])assert.equal((await request(path,'POST',{message},buyer.cookie)).status,400);
});
test('support conversations are visible to their owner and active admins only',async()=>{
 const r=await request('/conversations','POST',{kind:'support'},buyer.cookie);const id=r.body.conversation.id;const path='/conversations/'+id+'/messages';assert.equal((await request('/conversations','POST',{kind:'support'},buyer.cookie)).body.conversation.id,id);
 assert.equal((await request(path,'POST',{message:'Kömək lazımdır'},buyer.cookie)).status,200);assert.equal((await request(path,'POST',{message:'Buyurun'},admin.cookie)).status,200);
 assert.equal((await request(path,'GET',null,other.cookie)).status,404);assert.equal((await request('/conversations','GET',null,admin.cookie)).body.conversations[0].kind,'support');
});
test('history pagination keeps messages with identical timestamps and migration is repeatable',async()=>{
 const path='/conversations/'+conversation+'/messages';for(let i=0;i<55;i++)await query('INSERT INTO conversation_messages(id,conversation_id,sender_id,body,created_at) VALUES($1,$2,$3,$4,$5)',[randomUUID(),conversation,buyer.id,'page '+i,'2026-01-01T00:00:00Z']);
 const page=(await request(path,'GET',null,buyer.cookie)).body;assert.equal(page.messages.length,50);assert.equal(page.hasMore,true);const first=page.messages[0];const older=(await request(path+'?before='+encodeURIComponent(first.created_at)+'&before_id='+first.id,'GET',null,buyer.cookie)).body;assert.equal(older.messages.length,7);assert.equal(new Set([...page.messages,...older.messages].map(m=>m.id)).size,57);
 const sql=await readFile(new URL('../server/messages-schema.sql',import.meta.url),'utf8');await(await database()).exec(sql);assert.equal((await request(path,'GET',null,buyer.cookie)).body.messages.length,50);
});
