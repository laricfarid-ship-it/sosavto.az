import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {extname,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import bcrypt from 'bcryptjs';
if(process.env.VERCEL||process.env.NODE_ENV==='production')throw Error('Local test only');
delete process.env.DATABASE_URL;process.env.LOCAL_DATABASE='true';process.env.LOCAL_DB_PATH='memory://';process.env.APP_ORIGIN='http://localhost:4182';
const {database,query,close}=await import('../server/db.mjs');const {default:handler}=await import('../api/index.mjs');
await(await database()).exec(await readFile('server/schema.sql','utf8'));
const buyer=randomUUID(),seller=randomUUID(),listing=randomUUID();const password='Strong-password-123',hash=await bcrypt.hash(password,12);
for(const [id,name] of [[buyer,'buyer'],[seller,'seller']])await query('INSERT INTO users(id,fullname,username,email,password_hash) VALUES($1,$2,$2,$3,$4)',[id,name,name+'@example.test',hash]);
await query("INSERT INTO listings(id,user_id,category,title,description,price,city,phone,status) VALUES($1,$2,'car','BMW Test','Test avtomobil',20000,'Bakı','0501234567','active')",[listing,seller]);
const server=http.createServer(async(req,res)=>{const path=new URL(req.url,process.env.APP_ORIGIN).pathname;if(path.startsWith('/api/'))return handler(req,res);try{res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'})[extname(path)]||'application/octet-stream');res.end(await readFile(resolve('.'+path)));}catch{res.statusCode=404;res.end();}});await new Promise(r=>server.listen(4182,'127.0.0.1',r));
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--no-proxy-server']});const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.APP_ORIGIN+'/giris.html');await page.locator('.business-login-card').waitFor();await page.screenshot({path:'/tmp/sosavto-login-mobile.png',fullPage:true});assert.equal(await page.locator('input[name=identifier]').count(),1);
 await page.getByRole('link',{name:'Biznes hesabına giriş',exact:true}).click();await page.getByRole('heading',{name:'Biznes hesabına giriş'}).waitFor();await page.locator('[name=identifier]').fill('buyer');await page.locator('[name=password]').fill(password);await page.locator('#auth button').click();await page.locator('#auth-error.error').waitFor();assert.match(await page.locator('#auth-error').textContent(),/biznes kimi/);
 await page.getByRole('link',{name:'Fərdi hesaba giriş'}).click();await page.locator('[name=identifier]').fill('buyer');await page.locator('[name=password]').fill(password);await page.locator('#auth button').click();await page.waitForURL('**/index.html');
 await page.goto(process.env.APP_ORIGIN+'/elan.html?id='+listing);await page.getByRole('link',{name:'Mesaj göndər',exact:true}).click();await page.locator('#message-compose:not([hidden])').waitFor();await page.locator('[name=message]').fill('Salam, avtomobil satılıb?');await page.locator('#message-compose button').click();await page.getByText('Salam, avtomobil satılıb?',{exact:true}).first().waitFor();await page.reload();await page.locator('.message-bubble').waitFor();assert.match(await page.locator('#message-history').textContent(),/avtomobil satılıb/);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);await page.screenshot({path:'/tmp/sosavto-messages-mobile.png',fullPage:true});await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'/tmp/sosavto-messages-desktop.png',fullPage:true});
 await page.getByRole('button',{name:'Dəstəyə yaz',exact:true}).click();await page.getByRole('heading',{name:'SosAvto dəstək'}).waitFor();assert.equal(errors.length,0,errors.join('\n'));console.log('PASS mobile and desktop login, business validation, listing → message → database → reload and support flow');
}finally{await browser?.close();await new Promise(r=>server.close(r));await close();}
