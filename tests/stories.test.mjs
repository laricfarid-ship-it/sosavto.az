import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Readable} from 'node:stream';
import {readFile} from 'node:fs/promises';
process.env.LOCAL_DATABASE='true';process.env.LOCAL_DB_PATH='memory://';process.env.APP_ORIGIN='http://localhost:4173';delete process.env.DATABASE_URL;
const {database,query,close}=await import('../server/db.mjs');
const {default:handler}=await import('../api/index.mjs');
async function request(path,{method='GET',data,cookie}={}){
 const req=Readable.from(data===undefined?[]:[JSON.stringify(data)]);req.method=method;req.url='/api'+path;
 req.headers={...(method==='GET'?{}:{origin:process.env.APP_ORIGIN,'content-type':'application/json'}),...(cookie?{cookie}:{})};
 const headers={};let output;const res={statusCode:200,setHeader:(k,v)=>headers[k.toLowerCase()]=v,end:v=>output=v};
 await handler(req,res);return {status:res.statusCode,body:JSON.parse(output),cookie:headers['set-cookie']?.split(';')[0]};
}
before(async()=>{await (await database()).exec(await readFile(new URL('../server/schema.sql',import.meta.url),'utf8'));});
after(async()=>{await close();});
test('stories: trial starts with first post, maximum 3, owner isolation, expiry and no automatic billing',async()=>{
 const a=await request('/register',{method:'POST',data:{fullname:'Story Owner',username:'story_owner',email:'story@example.test',password:'Password12345!'}});
 const b=await request('/register',{method:'POST',data:{fullname:'Story Other',username:'story_other',email:'story2@example.test',password:'Password12345!'}});
 assert.equal(a.status,201);assert.equal(b.status,201);
 assert.equal((await request('/stories',{cookie:a.cookie})).body.trial,null);
 const media=[];for(let i=0;i<4;i++){const url='/media/'+randomUUID()+'.webp';media.push(url);await query('INSERT INTO images(id,user_id,url) VALUES($1,$2,$3)',[randomUUID(),a.body.user.id,url]);}
 const payload=url=>({media_type:'image',media_url:url,caption:'Test stori'});
 assert.equal((await request('/stories',{method:'POST',cookie:b.cookie,data:payload(media[0])})).status,400);
 for(let i=0;i<3;i++)assert.equal((await request('/stories',{method:'POST',cookie:a.cookie,data:payload(media[i])})).status,201);
 assert.equal((await request('/stories',{method:'POST',cookie:a.cookie,data:payload(media[3])})).status,409);
 const list=await request('/stories',{cookie:a.cookie});assert.equal(list.body.stories.length,3);
 assert.ok(list.body.trial.ends_at);
 const story=list.body.stories[0];
 assert.equal((await request('/stories/'+story.id,{method:'DELETE',cookie:b.cookie,data:{}})).status,404);
 assert.equal((await request('/stories/'+story.id,{method:'DELETE',cookie:a.cookie,data:{}})).status,200);
 assert.equal((await request('/stories')).body.stories.length,2);
 await query("UPDATE stories SET expires_at=now()-interval '1 minute'");
 assert.equal((await request('/stories')).body.stories.length,0);
 await query("UPDATE story_trials SET ends_at=now()-interval '1 minute'");
 assert.equal((await request('/stories',{method:'POST',cookie:a.cookie,data:payload(media[3])})).status,403);
 assert.equal((await query('SELECT count(*)::integer AS n FROM story_trials')).rows[0].n,1);
});
