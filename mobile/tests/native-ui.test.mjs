import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {JSDOM} from 'jsdom';
import {buildHostedUI} from '../scripts/build-hosted-ui.mjs';
const code=await readFile(new URL('../ui/native.js',import.meta.url),'utf8');
function setup(url='https://sosavto.az/elan?id=test'){
 const dom=new JSDOM('<html data-theme="light"><body><header><nav class="nav"></nav></header><div class="detail-layout"><p class="description">**Toyota**\n* Təmiz avtomobil &lt;script&gt;x&lt;/script&gt;</p><p>**Unrelated text**</p><a id="contact" href="tel:0123">Zəng et</a></div></body></html>',{url,runScripts:'outside-only',pretendToBeVisual:true});
 const calls=[];dom.window.Capacitor={registerPlugin:()=>({setTheme:async data=>calls.push(['theme',data]),notificationStatus:async()=>({enabled:false}),enableNotifications:async()=>calls.push(['enable']),disableNotifications:async()=>calls.push(['disable'])})};
 dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};dom.window.HTMLDialogElement.prototype.close=function(){this.open=false;};
 dom.window.eval(code);return {dom,calls};
}
test('native UI stays off other origins and out of the hosted website bundle',async()=>{
 const {dom}=setup('https://example.test/');assert.equal(dom.window.document.querySelector('#sa-device-settings'),null);dom.window.close();
 const directory=await mkdtemp(join(tmpdir(),'sosavto-hosted-'));try{await buildHostedUI(directory);const bundle=await readFile(join(directory,'mobile-app.js'),'utf8');assert.ok(!bundle.includes('sa-device-settings'));assert.ok(!bundle.includes('sa-native-style'));}finally{await rm(directory,{recursive:true,force:true});}
});
test('settings requires explicit notification tap and deletion opens only a draft link',async()=>{
 const {dom,calls}=setup();try{const d=dom.window.document;assert.equal(calls.filter(c=>c[0]==='enable').length,0);d.querySelector('#sa-device-settings').click();await new Promise(r=>setTimeout(r,10));assert.ok(d.querySelector('dialog').open);
 d.querySelector('[data-enable]').click();await new Promise(r=>setTimeout(r,10));assert.equal(calls.filter(c=>c[0]==='enable').length,1);
 d.querySelector('[data-delete]').click();assert.equal(d.querySelector('[data-deletion]').hidden,false);assert.match(d.querySelector('[data-deletion] a').href,/^mailto:sosavtoaz@gmail.com/);assert.match(d.querySelector('[data-deletion]').textContent,/avtomatik silmir/);
 d.querySelector('[data-disable]').click();await new Promise(r=>setTimeout(r,10));assert.equal(calls.filter(c=>c[0]==='disable').length,1);
 dom.window.eval(code);assert.equal(d.querySelectorAll('#sa-device-settings').length,1);
 }finally{dom.window.close();}
});
test('description cleanup preserves escaped text, contact handlers, and unrelated paragraphs',()=>{
 const {dom}=setup();try{const d=dom.window.document;assert.match(d.querySelector('.description').textContent,/Toyota\n• Təmiz avtomobil <script>x<\/script>/);assert.equal(d.querySelector('script'),null);assert.equal(d.querySelectorAll('p')[1].textContent,'**Unrelated text**');assert.equal(d.querySelector('#contact').getAttribute('href'),'tel:0123');}finally{dom.window.close();}
});
