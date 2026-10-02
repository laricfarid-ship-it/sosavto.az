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
 const page=await browser.newPage({viewport:{width,height:850}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:4176/login');await page.goto('http://localhost:4176/elan-ver.html');
 const brand=page.locator('select[name=brand]'),model=page.locator('select[name=model]');await brand.waitFor();
 assert.equal(await brand.locator('option').nth(1).getAttribute('value'),'__other__');
 for(const [b,m] of [['Lada','2107'],['Denza','D9'],['Aito','M9'],['Fiat','Panda'],['Tofaş','Şahin'],['Cadillac','Escalade']]){await brand.selectOption(b);await model.selectOption(m);assert.equal(await model.inputValue(),m);}
 await brand.selectOption('LiXiang (Lixiang)');await model.selectOption('L7');assert.equal(await page.locator('[data-custom=brand]').isHidden(),true);
 await brand.selectOption('__other__');await page.locator('[data-custom=brand]').fill('Retro Test');await page.locator('[data-custom=brand]').dispatchEvent('change');await model.selectOption('__other__');await page.locator('[data-custom=model]').fill('Custom 1890');
 await page.locator('[name=category]').selectOption('parts');assert.equal(await page.locator('[data-custom=model]').isDisabled(),false);
 await page.locator('[name=category]').selectOption('car');await page.locator('[name=year]').fill('1890');assert.equal(await page.locator('[name=year]').evaluate(e=>e.checkValidity()),true);
 await page.goto('http://localhost:4176/index.html?category=car&model=2107&brand=Lada');await page.locator('#search select[name=brand]').waitFor();assert.equal(await page.locator('#search [name=model]').inputValue(),'2107');
 await page.locator('#search [name=brand]').selectOption('__other__');await page.locator('[data-custom=brand]').fill('Retro Test');await page.locator('[data-custom=brand]').dispatchEvent('change');await page.locator('#search [name=model]').selectOption('__other__');await page.locator('[data-custom=model]').fill('Custom 1890');
 await page.locator('#search button[type=submit]').click();await page.waitForURL(/brand=Retro/);assert.equal(new URL(page.url()).searchParams.get('model'),'Custom 1890');await page.locator('[data-custom=model]').waitFor();assert.equal(await page.locator('[data-custom=model]').inputValue(),'Custom 1890');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);console.log('PASS native lists, Other, category toggle, custom URL restore '+width+'px');await page.close();
}
}finally{await browser?.close();server.close();}
