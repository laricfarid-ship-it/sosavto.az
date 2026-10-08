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
await page.route('https://*.tile.openstreetmap.org/**',r=>r.abort());
const ids=[];
for(const [category,status,details,address] of [['service','active',{},'Test küçəsi 1'],['wash','active',{},'Test küçəsi 1'],['parts','active',{map_visible:true},'Test küçəsi 2'],['parts','active',{},'Test küçəsi 3'],['car','active',{},'Test küçəsi 4'],['detailing','pending',{},'Test küçəsi 5']]){
 const lid=randomUUID();ids.push(lid);await query("INSERT INTO listings(id,user_id,category,title,description,price,city,phone,address,latitude,longitude,status,details) VALUES($1,$2,$3,'Test məkan','Test description here',10,'Bakı','+994501234567',$4,40.4093,49.8671,$5,$6)",[lid,id,category,address,status,JSON.stringify(details)]);
}
for(const width of [390,1280]){
 await page.setViewportSize({width,height:850});await page.goto('http://localhost:4176/xarita.html');await page.locator('.service-map-pin').first().waitFor();
 assert.equal(await page.locator('.service-map-pin').count(),2);assert.equal(await page.locator('#map-list .map-listing-link').count(),3);
 await page.locator('#map').scrollIntoViewIfNeeded();await page.locator('.service-map-pin').last().click();await page.locator('.leaflet-popup a[href^="https://www.waze.com"]').waitFor();assert.equal(await page.locator('.leaflet-popup a[href^="tel:"]').count(),1);
 assert.equal(await page.locator('#map-filter select[name="category"] option').count(),5);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:'/tmp/service-map-'+width+'.png'});console.log('PASS grouped map, contacts, Waze, filters, width '+width);
}
await query("UPDATE listings SET status='archived' WHERE id=$1",[ids[0]]);await query("DELETE FROM listings WHERE id=$1",[ids[1]]);
await page.reload();await page.locator('.service-map-pin').first().waitFor();assert.equal(await page.locator('#map-list .map-listing-link').count(),1);console.log('PASS archive and deletion remove map entries');
await page.goto('http://localhost:4176/login');await page.goto('http://localhost:4176/elan-ver.html?category=parts');await page.locator('[name="map_visible"]').waitFor();assert.equal(await page.locator('[name="map_visible"]').isChecked(),false);await page.selectOption('[name="category"]','service');assert.equal(await page.locator('[name="map_visible"]').isVisible(),false);console.log('PASS parts opt-in only');
}finally{await browser?.close();server.close();}
