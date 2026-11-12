import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {Readable} from 'node:stream';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
process.env.LOCAL_DATABASE='true';process.env.LOCAL_DB_PATH='memory://';process.env.APP_ORIGIN='http://localhost:4173';delete process.env.DATABASE_URL;delete process.env.VERCEL;
const {database,query,close}=await import('../server/db.mjs'),{createSession}=await import('../server/security.mjs'),{default:handler}=await import('../api/index.mjs');
const {mountStories,mountStoryModeration}=await import('../assets/stories.js');let dom,cookie,me,listing;
const notices=[];
async function api(path,method='GET',data){const req=Readable.from(data?[Buffer.from(JSON.stringify(data))]:[]);req.method=method;req.url='/api'+path;req.headers={cookie,origin:process.env.APP_ORIGIN,'content-type':'application/json'};let raw;const res={statusCode:200,setHeader(){},end(v){raw=v;}};await handler(req,res);const b=JSON.parse(raw);if(res.statusCode>=400){const e=new Error(b.error);e.status=res.statusCode;throw e;}return b;}
async function until(fn){for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setTimeout(r,10));}throw Error('UI state did not arrive');}
before(async()=>{await(await database()).exec(await readFile(new URL('../server/schema.sql',import.meta.url),'utf8'));me={id:randomUUID(),fullname:'Story Owner',role:'user'};
 await query('INSERT INTO users(id,fullname,username,email,password_hash) VALUES($1,$2,$3,$4,$5)',[me.id,me.fullname,'uiowner','ui@example.test','hash']);cookie=(await createSession({setHeader(){}},me)).split(';')[0];listing=randomUUID();await query("INSERT INTO listings(id,user_id,category,title,description,price,city,phone,status) VALUES($1,$2,'car','BMW 530 <img>','Listing for story',45000,'Bakı','000000','active')",[listing,me.id]);await query('INSERT INTO images(id,user_id,listing_id,url) VALUES($1,$2,$3,$4)',[randomUUID(),me.id,listing,'https://example.test/car.webp']);
 dom=new JSDOM('<main><section id="stories"></section></main>',{url:'http://localhost:4173/'});const w=dom.window;
 Object.assign(globalThis,{document:w.document,location:{origin:'http://localhost:4173',pathname:'/',search:''},sessionStorage:w.sessionStorage,FileReader:w.FileReader,requestAnimationFrame:()=>0,cancelAnimationFrame:()=>{}});
 Object.defineProperty(globalThis,'navigator',{value:{clipboard:{writeText:async()=>{}}},configurable:true});
 w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new w.Event('close'));};
});
after(async()=>{dom.window.close();await close();});
test('actual composer → resolve API → publish → viewer → delete → quota, plus empty and unavailable states',async()=>{
 const root=document.querySelector('#stories');await mountStories(root,{api,me,toast:t=>notices.push(t)});assert.match(root.textContent,/İlk story səndən olsun/);assert.equal(root.querySelectorAll('.story-bubble').length,1);
 root.querySelector('.story-add').click();await until(()=>document.querySelector('[name=mine] option[value="'+listing+'"]'));
 const select=document.querySelector('[name=mine]');select.value=listing;select.dispatchEvent(new dom.window.Event('change'));await until(()=>document.querySelector('.story-linked').textContent.startsWith('✓'));
 const caption=document.querySelector('[name=caption]');caption.value='<script>alert(1)</script>';caption.dispatchEvent(new dom.window.Event('input'));assert.equal(document.querySelectorAll('.story-preview script').length,0);assert.equal(document.querySelector('.story-preview-copy p').textContent,caption.value);
 document.querySelector('[data-theme=ocean]').click();assert.ok(document.querySelector('.story-preview.theme-ocean'));
 document.querySelector('form').dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await until(()=>!document.querySelector('.story-composer')&&root.querySelector('[data-story]'));
 assert.equal((await api('/stories')).allowance.remaining,0);assert.match(root.querySelector('.story-add').textContent,/Paylaşdın/);
 root.querySelector('[data-story]').click();assert.equal(document.querySelector('.story-listing-card').getAttribute('href'),'/elan?id='+listing);assert.equal(document.querySelectorAll('.story-viewer script').length,0);
 document.querySelector('[data-delete]').click();assert.match(document.querySelector('[data-delete]').textContent,/təsdiqlə/);document.querySelector('[data-delete]').click();await until(()=>!document.querySelector('.story-viewer')&&!root.querySelector('[data-story]'));
 root.querySelector('.story-add').click();assert.equal(document.querySelector('.story-composer'),null);assert.match(notices.at(-1),/00:00/);assert.equal((await api('/stories')).allowance.remaining,0);
 await mountStories(root,{api:async()=>{throw Error('offline')},me,toast:()=>{}});assert.match(root.textContent,/Storylər yüklənmədi/);assert.ok(root.querySelector('button'));
});
test('moderation shows a permission error for ordinary users',async()=>{
 const native=globalThis.fetch;globalThis.fetch=async()=>({ok:false,json:async()=>({error:'Bu əməliyyat üçün icazəniz yoxdur.'})});try{await mountStoryModeration(document.querySelector('#stories'));assert.match(document.querySelector('#stories').textContent,/icazəniz yoxdur/);}finally{globalThis.fetch=native;}
});
