import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {mountSpinViewer} from '../assets/spin-viewer.js';
import {mountSpinUploader} from '../assets/spin-uploader.js';
const frames=Array.from({length:24},(_,i)=>({id:String(i),url:`https://example.test/${i}.webp`}));
const fixture=()=>new JSDOM('<section></section>');
const tick=()=>new Promise(r=>setImmediate(r));
test('360 viewer requires complete sequence, lazy starts, wraps and supports drag, keys and range',()=>{
 const dom=fixture(),host=dom.window.document.querySelector('section');try{
 mountSpinViewer(host,frames.slice(0,8));assert.ok(host.hidden);
 mountSpinViewer(host,frames);assert.equal(host.querySelector('img').getAttribute('src'),null);
 host.querySelector('.spin-start').click();assert.equal(host.querySelector('img').src,frames[0].url);
 host.querySelector('.spin-prev').click();assert.equal(host.querySelector('img').src,frames[23].url);
 const stage=host.querySelector('.spin-stage');stage.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'ArrowRight'}));assert.equal(host.querySelector('img').src,frames[0].url);
 const range=host.querySelector('input');range.value='10';range.dispatchEvent(new dom.window.Event('input'));assert.equal(host.querySelector('img').src,frames[10].url);
 stage.dispatchEvent(new dom.window.MouseEvent('pointerdown',{clientX:100,clientY:10}));stage.dispatchEvent(new dom.window.MouseEvent('pointermove',{clientX:124,clientY:11}));assert.equal(host.querySelector('img').src,frames[12].url);
 stage.dispatchEvent(new dom.window.Event('pointercancel'));stage.dispatchEvent(new dom.window.MouseEvent('pointermove',{clientX:160,clientY:11}));assert.equal(host.querySelector('img').src,frames[12].url);
 host.querySelector('img').dispatchEvent(new dom.window.Event('error'));assert.match(host.querySelector('[role=status]').textContent,/yüklənmədi/);
 }finally{dom.window.close();}
});
test('360 uploader sorts naturally, resumes only missing frames and blocks incomplete save',async()=>{
 const dom=fixture(),host=dom.window.document.querySelector('section');try{
 const uploaded=[],busy=[];let fail=true;
 const ui=mountSpinUploader(host,{frames:[],enabled:true,setBusy:b=>busy.push(b),upload:async f=>{if(f.name==='003.jpg'&&fail){fail=false;throw Error('offline');}uploaded.push(f.name);return {id:f.name,url:'https://example.test/'+f.name};}});
 const input=host.querySelector('input[type=file]');const files=Array.from({length:24},(_,i)=>new dom.window.File(['x'],String(i+1).padStart(3,'0')+'.jpg',{type:'image/jpeg'})).reverse();
 Object.defineProperty(input,'files',{value:files,configurable:true});input.dispatchEvent(new dom.window.Event('change'));await tick();
 assert.throws(()=>ui.ids(),/tamamlayın/);assert.deepEqual(uploaded,['001.jpg','002.jpg']);assert.equal(ui.busy,false);
 host.querySelector('.spin-retry').click();await tick();assert.equal(ui.ids().length,24);assert.equal(uploaded.length,24);assert.equal(ui.ids()[0],'001.jpg');assert.deepEqual(busy,[true,false,true,false]);
 host.querySelector('.spin-reverse').click();assert.equal(ui.ids()[0],'024.jpg');host.querySelector('.spin-remove').click();assert.deepEqual(ui.ids(),[]);
 Object.defineProperty(input,'files',{value:files.slice(0,8)});input.dispatchEvent(new dom.window.Event('change'));assert.match(host.querySelector('.spin-upload-state').textContent,/24–36/);assert.equal(uploaded.length,24);
 }finally{dom.window.close();}
});
test('discarding failed replacement preserves existing 360 frames',async()=>{
 const dom=fixture(),host=dom.window.document.querySelector('section');try{
 const ui=mountSpinUploader(host,{frames,enabled:true,setBusy:()=>{},upload:async()=>{throw Error('offline');}});
 const input=host.querySelector('input[type=file]');Object.defineProperty(input,'files',{value:frames.map((_,i)=>new dom.window.File(['x'],i+'.jpg',{type:'image/jpeg'}))});input.dispatchEvent(new dom.window.Event('change'));await tick();host.querySelector('.spin-cancel').click();assert.deepEqual(ui.ids(),frames.map(p=>p.id));
 }finally{dom.window.close();}
});
