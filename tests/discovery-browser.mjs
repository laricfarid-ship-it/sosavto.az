// Isolated browser -> actual API -> in-memory PostgreSQL fixture. Never production.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {randomUUID} from 'node:crypto';
if(process.env.VERCEL||process.env.NODE_ENV==='production')throw Error('Local test only');
delete process.env.DATABASE_URL;delete process.env.OPENAI_API_KEY;delete process.env.GEMINI_API_KEY;
process.env.LOCAL_DATABASE='true';process.env.LOCAL_DB_PATH='memory://';process.env.APP_ORIGIN='http://localhost:4178';
const {database,query,close}=await import('../server/db.mjs');const {default:handler}=await import('../api/index.mjs');
await (await database()).exec(await readFile('server/schema.sql','utf8'));
const user=randomUUID(),ids=Array.from({length:4},()=>randomUUID());
await query("INSERT INTO users(id,fullname,username,email,password_hash) VALUES($1,'Test Owner','discovery','discovery@test.invalid','unused')",[user]);
for(let i=0;i<4;i++){
 await query("INSERT INTO listings(id,user_id,category,title,description,price,city,brand,model,year,mileage,phone,details,status) VALUES($1,$2,'car',$3,'Isolated test fixture', $4,'Bakı',$5,$6,$7,$8,'+994501234567',$9,'active')",[ids[i],user,['Hyundai Elantra 2018','Toyota RAV4 2021','BMW 320 2019','Hyundai Sonata 2020'][i],[24500,49000,36500,31000][i],['Hyundai','Toyota','BMW','Hyundai'][i],['Elantra','RAV4','3 Series','Sonata'][i],[2018,2021,2019,2020][i],90000-i*10000,JSON.stringify({body:i===1?'SUV':'Sedan',fuel:'Benzin',transmission:'Avtomat',engine:i===1?'2.5':'2.0'})]);
 for(let j=0;j<3;j++)await query('INSERT INTO images(id,user_id,listing_id,url,sort_order) VALUES($1,$2,$3,$4,$5)',[randomUUID(),user,ids[i],'/media/test-'+((i+j)%3+1)+'.svg',j]);
}
const requests=[];
const server=http.createServer(async(req,res)=>{
 const path=new URL(req.url,process.env.APP_ORIGIN).pathname;
 if(path.startsWith('/api/')){requests.push(req.url);return handler(req,res);}
 let file;
 if(/^\/media\/test-[123]\.svg$/.test(path))file='assets/demo-car-'+path.match(/[123]/)[0]+'.svg';
 else if(/^\/(?:[a-z-]+\.html|assets\/[a-z0-9.-]+)$/.test(path))file='.'+path;
 else {res.statusCode=404;return res.end();}
 try{res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml'})[extname(file)]||'application/octet-stream');res.end(await readFile(resolve(file)));}catch{res.statusCode=404;res.end();}
});
await new Promise(r=>server.listen(4178,'127.0.0.1',r));
let browser;
try{
 const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
 browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--no-proxy-server']});
 const output=process.env.SCREENSHOT_DIR||'/tmp/sosavto-discovery';await mkdir(output,{recursive:true});
 for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://**/*',route=>route.abort());
  await page.goto('http://localhost:4178/index.html');await page.locator('#results [data-compare]').first().waitFor();
  assert.equal(await page.locator('#results .card').count(),4);
  assert.equal(await page.locator('#results').evaluate(el=>!!(el.compareDocumentPosition(document.querySelector('#demo-listings'))&Node.DOCUMENT_POSITION_FOLLOWING)),true);
  assert.ok(requests.some(p=>p==='/api/listings?category=car'));
  await page.screenshot({path:output+'/home-'+width+'.png',fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.locator('[data-body="SUV"]').click();await page.waitForURL(/body=SUV/);await page.locator('#results .card').waitFor();assert.equal(await page.locator('#results .card').count(),1);assert.match(await page.locator('#results').innerText(),/RAV4/);
  await page.locator('.filter-chip').filter({hasText:'Kuzov:'}).click();await page.waitForURL(url=>!url.searchParams.has('body'));await page.locator('#results [data-compare]').first().waitFor();assert.equal(await page.locator('#results .card').count(),4);
  await page.locator('[name=price_min]').fill('24000');await page.locator('[name=price_max]').fill('30000');await page.locator('#search button[type=submit]').click();await page.waitForURL(/price_min=24000/);await page.locator('#results .card').waitFor();assert.equal(await page.locator('#results .card').count(),1);
  await page.locator('[data-category=all]').click();await page.waitForURL(/category=all/);await page.locator('#results .card').first().waitFor();assert.equal(await page.locator('#results .card').count(),4);
  for(let i=0;i<4;i++)await page.locator('#results [data-compare]').nth(i).click();
  assert.equal(await page.locator('#results [data-compare][aria-pressed=true]').count(),3);assert.match(await page.locator('#toast').innerText(),/Maksimum 3/);
  await page.reload();await page.locator('#compare-bar a').waitFor();assert.equal(await page.locator('#results [data-compare][aria-pressed=true]').count(),3);
  await page.locator('#compare-bar a').click();await page.locator('.comparison-table').waitFor();assert.equal(await page.locator('.comparison-table thead th').count(),4);
  await page.locator('#differences').check();assert.equal(await page.locator('tr[data-same=true]').first().isVisible(),false);
  await page.screenshot({path:output+'/compare-'+width+'.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.goto('http://localhost:4178/elan.html?id='+ids[0]);await page.locator('#gallery-next').waitFor();await page.locator('#gallery-next').click();assert.equal(await page.locator('#gallery-count').innerText(),'2 / 3');
  await page.locator('.gallery-stage').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#gallery-count').innerText(),'3 / 3');
  await page.locator('[data-gallery="0"]').click();assert.equal(await page.locator('#gallery-count').innerText(),'1 / 3');
  await page.locator('.gallery-stage').evaluate(el=>{el.dispatchEvent(new TouchEvent('touchstart',{touches:[new Touch({identifier:1,target:el,clientX:250,clientY:100})]}));el.dispatchEvent(new TouchEvent('touchend',{changedTouches:[new Touch({identifier:1,target:el,clientX:100,clientY:110})]}));});assert.equal(await page.locator('#gallery-count').innerText(),'2 / 3');
  await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:output+'/detail-'+width+'.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);console.log('PASS '+width+'px: actual API filters, chip removal, all category, comparison cap/persistence/differences, gallery, no overflow or JS errors');await page.close();
 }
}finally{await browser?.close();await new Promise(r=>server.close(r));await close();}
