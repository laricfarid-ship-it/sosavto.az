import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {JSDOM} from 'jsdom';
import {buildHostedUI} from '../mobile/scripts/build-hosted-ui.mjs';
const theme=await readFile(new URL('../assets/theme.js',import.meta.url),'utf8');
const legacyJS=await readFile(new URL('../mobile/ui/app.js',import.meta.url),'utf8');
const updates=await readFile(new URL('../mobile/ui/updates.js',import.meta.url),'utf8');
function dom(native=true){const d=new JSDOM('<html><head></head><body><form><input name="q"></form></body></html>',{url:'https://sosavto.az/ai.html',runScripts:'outside-only',pretendToBeVisual:true});if(native)d.window.androidBridge={};return d;}
function close(d){d.window.dispatchEvent(new d.window.Event('pagehide'));d.window.close();}
test('desktop theme does not request mobile assets or change the layout',()=>{const d=dom(false);d.window.eval(theme);assert.equal(d.window.document.querySelector('script[src="/assets/mobile-app.js"]'),null);assert.equal(d.window.__sosavtoAppUI,undefined);assert.ok(!d.window.document.documentElement.classList.contains('sa-app'));close(d);});
test('installed APK is claimed before legacy injection and hosted runtime mounts once',async()=>{const dir=await mkdtemp(join(tmpdir(),'sosavto-mobile-'));try{const version=await buildHostedUI(dir);const js=await readFile(join(dir,'mobile-app.js'),'utf8');const d=dom();d.window.eval(theme);assert.equal(d.window.__sosavtoAppUI,true);assert.equal(d.window.__sosavtoHostedUI,undefined);assert.equal(d.window.document.querySelectorAll('script[src="/assets/mobile-app.js"]').length,1);
 // The old APK tests this flag before installing its observer and navigation.
 let oldMount=false;if(!d.window.__sosavtoAppUI)oldMount=true;assert.equal(oldMount,false);
 d.window.eval(js);d.window.eval(js);assert.equal(d.window.document.querySelectorAll('#sa-bottom').length,1);assert.equal(d.window.__sosavtoMobileVersion,version);assert.ok(d.window.document.querySelector('#sa-app-style').textContent.includes('.sa-app'));assert.equal(JSON.parse(await readFile(join(dir,'mobile-version.json'),'utf8')).version,version);close(d);
 const desktop=dom(false);desktop.window.eval(js);assert.equal(desktop.window.document.querySelector('#sa-bottom'),null);close(desktop);
}finally{await rm(dir,{recursive:true,force:true});}});
test('update check preserves typed form data and deduplicates update notice',async()=>{const d=dom();const w=d.window;w.eval(legacyJS);w.__sosavtoMobileVersion='old';w.fetch=async(url,options)=>{assert.equal(url,'/assets/mobile-version.json');assert.equal(options.cache,'no-store');return {ok:true,json:async()=>({version:'new'})};};w.eval(updates);const input=w.document.querySelector('input');input.value='Saxlanılmamış elan';input.dispatchEvent(new w.Event('input',{bubbles:true}));w.dispatchEvent(new w.Event('focus'));await new Promise(r=>setTimeout(r,30));assert.equal(input.value,'Saxlanılmamış elan');assert.equal(w.document.querySelectorAll('#sa-update').length,1);w.confirm=()=>false;w.document.querySelector('#sa-update button').click();assert.equal(input.value,'Saxlanılmamış elan');w.dispatchEvent(new w.Event('focus'));await new Promise(r=>setTimeout(r,30));assert.equal(w.document.querySelectorAll('#sa-update').length,1);close(d);});
test('failed update checks leave the current interface and data usable',async()=>{const d=dom();const w=d.window;w.eval(legacyJS);w.fetch=async()=>{throw Error('offline')};w.eval(updates);w.dispatchEvent(new w.Event('focus'));await new Promise(r=>setTimeout(r,30));assert.equal(w.document.querySelectorAll('#sa-bottom').length,1);assert.equal(w.document.querySelector('#sa-update'),null);close(d);});
