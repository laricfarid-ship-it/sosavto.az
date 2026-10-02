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
const page=await browser.newPage({viewport:{width:390,height:850}});
for(const c of ['car','parts','insurance','plates','service','detailing']){
 await page.goto('http://localhost:4176/index.html?category='+c);await page.locator('#demo-listings').waitFor();assert.equal(await page.locator('#demo-listings .card').count(),3);
 assert.equal(await page.locator('#demo-listings img').evaluateAll(imgs=>imgs.every(i=>i.complete&&i.naturalWidth>0)),true);
 await page.locator('#demo-listings [data-demo]').first().click();await page.locator('#dialog[open]').waitFor();assert.ok((await page.locator('#dialog').textContent()).includes('rezervasiya yoxdur'));await page.locator('#dialog button').click();
 console.log('PASS demo category '+c);
}
await page.goto('http://localhost:4176/avtoyuma.html');await page.locator('#demo-listings').waitFor();assert.equal(await page.locator('#demo-listings .card').count(),3);
await page.goto('http://localhost:4176/index.html');await page.locator('#demo-listings').waitFor();assert.equal(await page.locator('#demo-listings .card').count(),21);await page.locator('#demo-listings').screenshot({path:'/tmp/demo-cards.png'});
await page.goto('http://localhost:4176/index.html?category=car&brand=BMW');await page.locator('#results').waitFor();assert.equal(await page.locator('#demo-listings').count(),0);console.log('PASS wash, all 21 cards, filtered search excludes samples');
}finally{await browser?.close();server.close();}
