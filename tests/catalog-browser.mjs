// Isolated UI/API check: no real credentials, database or provider requests.
import assert from 'node:assert/strict';
import http from 'node:http';import {readFile} from 'node:fs/promises';import {resolve,extname} from 'node:path';import {randomUUID} from 'node:crypto';
if(process.env.VERCEL||process.env.NODE_ENV==='production')throw Error('Local test only');
delete process.env.DATABASE_URL;process.env.LOCAL_DATABASE='true';process.env.LOCAL_DB_PATH='memory://';process.env.APP_ORIGIN='http://localhost:4176';process.env.AI_PROVIDER='gemini';process.env.GEMINI_API_KEY='fixture-secret';
const {database,query}=await import('../server/db.mjs');const {createSession}=await import('../server/security.mjs');const {default:handler}=await import('../api/index.mjs');
await (await database()).exec(await readFile('server/schema.sql','utf8'));const id=randomUUID();await query("INSERT INTO users(id,fullname,username,email,password_hash) VALUES($1,'Test User','test_gemini','gemini@test.invalid','unused')",[id]);
let calls=0,quota=false;
globalThis.fetch=async url=>{assert.match(url,/^https:\/\/generativelanguage.googleapis.com\//);calls++;return {ok:!quota,status:quota?429:200,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{text:'Sınaq cavabı: avtomobilə baxış etdirin.'}]}}]})};};
const server=http.createServer(async(req,res)=>{const path=new URL(req.url,process.env.APP_ORIGIN).pathname;if(path==='/login'){await createSession(res,{id});res.writeHead(302,{Location:'/ai.html'});return res.end();}if(path.startsWith('/api/'))return handler(req,res);if(!/^\/(?:[a-z-]+\.html|assets\/[a-z0-9.-]+)$/.test(path)){res.statusCode=404;return res.end();}try{res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml'})[extname(path)]||'application/octet-stream');res.end(await readFile(resolve('.'+path)));}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(4176,'127.0.0.1',r));let browser;
try{const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE,args:['--no-sandbox','--disable-gpu','--no-proxy-server']});
for(const width of [390,1280]){
 const page=await browser.newPage({viewport:{width,height:850}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:4176/login');await page.goto('http://localhost:4176/elan-ver.html');
 const brand=page.locator('[name=brand]');await brand.waitFor();
 for(const [b,m] of [['Lada','2107'],['Denza','D9'],['Aito','M9'],['Fiat','Panda'],['Tofaş','Şahin'],['Cadillac','Escalade']]){
  await brand.fill(b);await brand.dispatchEvent('change');assert.ok(await page.locator('#model-options option').evaluateAll((els,m)=>els.some(e=>e.value===m),m),b+' '+m);
 }
 await brand.fill('Li Auto');await brand.dispatchEvent('change');assert.equal(await brand.inputValue(),'LiXiang (Lixiang)');
 await brand.fill('Retro Test');await brand.dispatchEvent('change');await page.locator('[name=model]').fill('Custom 1890');await page.locator('[name=year]').fill('1890');assert.equal(await page.locator('[name=year]').evaluate(e=>e.checkValidity()),true);
 await page.goto('http://localhost:4176/index.html?category=car&model=2107&brand=Lada');await page.locator('#search [name=brand]').waitFor();assert.equal(await page.locator('#search [name=model]').inputValue(),'2107');
 await page.locator('#search [name=brand]').fill('Retro Test');await page.locator('#search [name=brand]').dispatchEvent('change');await page.locator('#search [name=model]').fill('Custom 1890');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);console.log('PASS catalogue create/search/custom/retro '+width+'px');await page.close();
}
}finally{await browser?.close();server.close();}
