// Real Chromium UI checks against the isolated, synthetic-provider fixture only.
// PLAYWRIGHT_MODULE may point to an installed playwright-core/index.mjs.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=spawn(process.execPath,['tests/car-analysis-browser-server.mjs'],{stdio:['ignore','pipe','pipe']});
server.stderr.pipe(process.stderr);
await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',code=>no(Error(`Fixture exited: ${code}`)));});
let browser;
try{
 browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-proxy-server']});
 for(const width of [1280,390]){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:4174/__test/login');await page.locator('[data-pick="front"]').waitFor();
  const button=page.locator('#car-ai-analyze'),status=page.locator('#car-ai-status');
  const photo=async(role,file=role)=>{const chooser=page.waitForEvent('filechooser');await page.locator(`[data-pick="${role}"]`).click();await (await chooser).setFiles(resolve('.data/car-analysis-fixtures/'+file+'.png'));await page.waitForFunction(()=>document.querySelector('.car-ai-panel').getAttribute('aria-busy')==='false');};
  assert.equal(await button.isDisabled(),true);
  await photo('front');assert.equal(await page.locator('[data-filename="front"]').innerText(),'Seçilib: front.png');await photo('rear','front');assert.match(await status.innerText(),/təkrar/);assert.equal(await page.locator('[data-preview="rear"]').isVisible(),false);
  await photo('rear');assert.equal(await button.isDisabled(),true);await photo('interior');assert.equal(await button.isDisabled(),true);
  await page.locator('[name="year"]').fill('2018');await page.locator('[name="mileage"]').fill('80000');await page.locator('[name="price"]').fill('22000');
  await page.locator('#car-ai-consent').check();assert.equal(await button.isEnabled(),true);
  await button.click();await page.locator('#car-ai-apply').waitFor();
  assert.equal(await page.locator('[name="brand"]').inputValue(),'');assert.equal(await page.locator('#photos .photo').count(),0);
  assert.match(await page.locator('#car-ai-result').innerText(),/Elantra/);
  // Editing while reviewing must require fresh confirmation and preserve the edit.
  await page.locator('[name="color"]').selectOption('Qara');await page.locator('#car-ai-apply').click();
  assert.match(await status.innerText(),/dəyişib/);assert.equal(await page.locator('[data-field="color"]').isChecked(),false);
  await page.locator('#car-ai-apply').click();await page.waitForFunction(()=>document.querySelector('#car-ai-status').textContent.includes('Seçilən məlumatlar əlavə edildi'));
  assert.equal(await page.locator('[name="brand"]').inputValue(),'Hyundai');assert.equal(await page.locator('[name="model"]').inputValue(),'Elantra');assert.equal(await page.locator('[name="color"]').inputValue(),'Qara');assert.equal(await page.locator('[name="body"]').inputValue(),'Sedan');
  for(const [name,value]of Object.entries({year:'2018',mileage:'80000',price:'22000'}))assert.equal(await page.locator(`[name="${name}"]`).inputValue(),value);
  assert.equal(await page.locator('#photos .photo').count(),3);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'horizontal overflow');
  await page.locator('.car-ai-panel').screenshot({path:`/tmp/sosavto-car-analysis-${width}.png`});
  const state=await (await context.request.get('http://localhost:4174/__test/state')).json();assert.equal(state.calls,1,'identical inputs must reuse stored result');
  assert.deepEqual(errors,[]);console.log(`PASS ${width}px: three photos, consent, duplicate rejection, review, edit preservation, apply + gallery, cached result; no page errors`);
  await context.close();
 }
}finally{await browser?.close();server.kill();}
