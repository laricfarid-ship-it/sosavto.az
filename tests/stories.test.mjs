import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {Readable} from 'node:stream';
import sharp from 'sharp';
for(const key of ['S3_BUCKET','S3_PUBLIC_URL','S3_ENDPOINT','S3_REGION','S3_ACCESS_KEY_ID','S3_SECRET_ACCESS_KEY'])delete process.env[key];
process.env.LOCAL_DATABASE='true';process.env.LOCAL_DB_PATH='memory://';process.env.APP_ORIGIN='http://localhost:4173';delete process.env.DATABASE_URL;delete process.env.VERCEL;
const {database,query,close}=await import('../server/db.mjs');
const {createSession}=await import('../server/security.mjs');
const {default:handler}=await import('../api/index.mjs');
const {listingReference}=await import('../server/stories.mjs');
const ids=Array.from({length:4},()=>randomUUID()),cookies=[];const listing=randomUUID();let story;
async function request(path,{method='GET',data,cookie=cookies[0]}={}){
 const req=Readable.from(data?[Buffer.from(JSON.stringify(data))]:[]);req.url='/api'+path;req.method=method;req.headers={cookie:cookie||'',origin:process.env.APP_ORIGIN,'content-type':'application/json'};req.socket={remoteAddress:'192.0.2.193'};
 let output;const res={statusCode:200,setHeader(){},end(v){output=v;}};await handler(req,res);return {status:res.statusCode,body:JSON.parse(output)};
}
before(async()=>{await(await database()).exec(await readFile(new URL('../server/schema.sql',import.meta.url),'utf8'));for(let i=0;i<ids.length;i++){
 await query('INSERT INTO users(id,fullname,username,email,password_hash,role) VALUES($1,$2,$2,$3,$4,$5)',[ids[i],'story'+i,'story'+i+'@example.test','hash',i===3?'admin':'user']);cookies.push((await createSession({setHeader(){}},{id:ids[i]})).split(';')[0]);
 }await query("INSERT INTO listings(id,user_id,category,title,description,price,city,phone,status) VALUES($1,$2,'car','BMW 530','Description',28000,'Bakı','PRIVATE_PHONE','active')",[listing,ids[0]]);
 await query('INSERT INTO images(id,user_id,listing_id,url) VALUES($1,$2,$3,$4)',[randomUUID(),ids[0],listing,'https://example.test/car.webp']);});
after(close);
test('same-origin references and active listing lookup reject foreign URLs and private ads',async()=>{
 assert.throws(()=>listingReference('https://evil.test/elan?id='+listing));assert.throws(()=>listingReference('https://sosavto.az/elan?id=bad'));
 assert.equal(listingReference('https://sosavto.az/elan?id='+listing).id,listing);
 assert.equal((await request('/stories/resolve?ref='+listing,{cookie:''})).status,401);
 const n=(await query('SELECT listing_number FROM listings WHERE id=$1',[listing])).rows[0].listing_number;
 assert.equal((await request('/stories/resolve?ref='+n)).body.listing.id,listing);
 await query("UPDATE listings SET status='pending' WHERE id=$1",[listing]);assert.equal((await request('/stories/resolve?ref='+n)).status,404);await query("UPDATE listings SET status='active' WHERE id=$1",[listing]);
});
test('publishing is free, guest reads, daily Baku quota persists after deletion',async()=>{
 assert.equal((await request('/stories',{method:'POST',cookie:'',data:{reference:listing}})).status,401);
 assert.equal((await request('/stories')).body.allowance.remaining,1);
 let r=await request('/stories',{method:'POST',data:{reference:listing,caption:'<script>unsafe</script>',theme:'ocean'}});assert.equal(r.status,201);story=r.body.id;
 r=await request('/stories',{cookie:''});assert.equal(r.body.stories.length,1);assert.equal(r.body.allowance,null);const s=r.body.stories[0];assert.equal(s.listing.id,listing);assert.equal(s.author,'story0');assert.equal(s.user_id,undefined);assert.equal(s.email,undefined);assert.equal(s.listing.phone,undefined);assert.equal(s.media_key,undefined);assert.ok(Math.abs(Date.parse(s.expires_at)-Date.parse(s.created_at)-86400000)<1000);
 assert.equal((await request('/stories')).body.allowance.remaining,0);
 const day=(await query("SELECT (now() AT TIME ZONE 'Asia/Baku')::date AS day")).rows[0].day;const resets=(await request('/stories')).body.allowance.resets_at;assert.equal(new Date(resets).toISOString().slice(11,19),'20:00:00');assert.ok(day);
 assert.equal((await request('/stories/'+story,{method:'DELETE',cookie:cookies[1],data:{}})).status,404);
 assert.equal((await request('/stories/'+story+'/report',{method:'POST',cookie:cookies[1],data:{reason:'Uyğun olmayan məzmun'}})).status,200);
 assert.equal((await request('/stories?moderation=1',{cookie:cookies[1]})).status,403);assert.equal((await request('/stories?moderation=1',{cookie:cookies[3]})).body.stories[0].reports,1);
 assert.equal((await request('/stories/'+story,{method:'DELETE',data:{}})).status,200);
 assert.equal((await request('/stories',{cookie:''})).body.stories.length,0);
 assert.equal((await request('/stories',{method:'POST',data:{reference:listing}})).status,409);
 await query("UPDATE story_daily_posts SET day=(now() AT TIME ZONE 'Asia/Baku')::date-1 WHERE user_id=$1",[ids[0]]);
 assert.equal((await request('/stories',{method:'POST',data:{reference:listing}})).status,201);
});
test('invalid image and missing listing do not spend daily allowance; uploaded screenshot is reencoded',async()=>{
 assert.equal((await request('/stories',{method:'POST',cookie:cookies[1],data:{data:'data:image/png;base64,YmFk'}})).status,400);
 assert.equal((await request('/stories',{cookie:cookies[1]})).body.allowance.remaining,1);
 const png=await sharp({create:{width:200,height:300,channels:3,background:'#1c5b92'}}).png().toBuffer();
 const data='data:image/png;base64,'+png.toString('base64');const r=await request('/stories',{method:'POST',cookie:cookies[1],data:{data,caption:'Screenshot'}});assert.equal(r.status,201);
 const s=(await request('/stories',{cookie:cookies[1]})).body.stories.find(s=>s.own);assert.match(s.media_url,/^\/media\/.*\.webp$/);assert.equal(s.listing,null);
 const meta=await sharp('.data/uploads/'+s.media_url.split('/').pop()).metadata();assert.equal(meta.format,'webp');
 assert.equal((await request('/stories/'+s.id,{method:'DELETE',cookie:cookies[3],data:{}})).status,200);
});
test('simultaneous submissions cannot bypass the daily quota',async()=>{
 const results=await Promise.all([1,2].map(()=>request('/stories',{method:'POST',cookie:cookies[2],data:{reference:listing}})));
 assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);assert.equal((await query('SELECT count(*)::int AS n FROM stories WHERE user_id=$1',[ids[2]])).rows[0].n,1);
});
test('sold/deleted ads lose their CTA and expired stories disappear',async()=>{
 await query("UPDATE listings SET status='sold' WHERE id=$1",[listing]);const r=await request('/stories');assert.ok(r.body.stories.every(s=>s.listing===null));
 await query("UPDATE stories SET expires_at=now()-interval '1 second'");assert.equal((await request('/stories',{cookie:''})).body.stories.length,0);
});
test('cursor pagination preserves stories sharing the same timestamp',async()=>{
 for(let i=0;i<65;i++)await query("INSERT INTO stories(id,user_id,media_url,created_at) VALUES($1,$2,$3,'2026-01-01T00:00:00Z')",[randomUUID(),ids[0],'https://example.test/car.webp']);
 const first=(await request('/stories')).body;assert.equal(first.stories.length,60);assert.ok(first.next);
 const second=(await request('/stories?before='+encodeURIComponent(first.next))).body;assert.equal(second.stories.length,5);assert.equal(second.next,null);
 assert.equal(new Set([...first.stories,...second.stories].map(s=>s.id)).size,65);
 assert.equal((await request('/stories?before=invalid')).status,400);
});
test('additive production migration can run twice without losing stories or quota',async()=>{
 const before=(await query('SELECT count(*)::int n FROM stories')).rows[0].n;
 const sql=await readFile(new URL('../server/stories-schema.sql',import.meta.url),'utf8');
 for(let i=0;i<2;i++)for(const statement of sql.split(';').map(s=>s.trim()).filter(Boolean))await query(statement);
 assert.equal((await query('SELECT count(*)::int n FROM stories')).rows[0].n,before);
 assert.equal((await request('/stories',{cookie:cookies[2]})).body.allowance.remaining,0);
});
