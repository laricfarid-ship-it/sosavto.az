import fs from 'node:fs/promises';
// Run from repository root. Uses an isolated in-memory database only.
if(process.env.VERCEL||process.env.NODE_ENV==='production')throw Error('Local QA only');
delete process.env.DATABASE_URL;process.env.LOCAL_DATABASE='true';process.env.LOCAL_DB_PATH='memory://';process.env.PORT='4173';
const {database}=await import(process.cwd()+'/server/db.mjs');await (await database()).exec(await fs.readFile('server/schema.sql','utf8'));await import(process.cwd()+'/server/dev.mjs');
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote']});let failures=[],errors=[],checked=0;
for(const width of [360,390,430,768,980,1440])for(const theme of ['dark','light']){
 const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});await page.route('https://**/*',r=>r.abort());await page.addInitScript(t=>{if(!localStorage.getItem('sosavto-theme'))localStorage.setItem('sosavto-theme',t)},theme);page.on('pageerror',e=>errors.push(e.message));
 for(const path of ['index.html','index.html?category=motorcycle','index.html?category=parts','index.html?category=service','giris.html','ai.html','sos.html']){
 await page.goto('http://localhost:4173/'+path,{waitUntil:'domcontentloaded'});await page.locator('#header .brand').waitFor();await page.waitForTimeout(100);
 const result=await page.evaluate(()=>{const rect=s=>document.querySelector(s)?.getBoundingClientRect();const h=rect('.discovery-hero'),c=rect('.discovery-copy'),s=rect('.sa-home-search');return {overflow:document.documentElement.scrollWidth>innerWidth+1,clipped:!!h&&c.bottom>h.bottom+1,overlap:!!h&&s.top<h.bottom-1};});checked++;if(Object.values(result).some(Boolean))failures.push({width,theme,path,...result});
 if(path==='index.html'&&process.env.SCREENSHOT_DIR)await page.screenshot({path:`${process.env.SCREENSHOT_DIR}/home-${width}-${theme}.png`,fullPage:true});
 }
 await page.locator('[data-theme-toggle]').click();
 const next=theme==='dark'?'light':'dark';
 if(await page.locator('html').getAttribute('data-theme')!==next)failures.push({width,theme,toggle:true});
 await page.reload({waitUntil:'domcontentloaded'});await page.locator('#header .brand').waitFor();
 if(await page.locator('html').getAttribute('data-theme')!==next)failures.push({width,theme,persistence:true});
 await page.close();
}
console.log(JSON.stringify({checked,failures,errors:[...new Set(errors)]}));await browser.close();process.exit(failures.length||errors.length?1:0);
