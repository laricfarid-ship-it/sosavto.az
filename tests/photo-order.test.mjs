import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {mountPhotoOrder} from '../assets/photo-order.js';
function setup(){const dom=new JSDOM('<main></main>'),doc=dom.window.document,host=doc.querySelector('main'),photos=[{id:'a'},{id:'b'},{id:'c'}];const render=()=>{host.innerHTML=photos.map((p,i)=>`<div data-photo-index="${i}"><button data-photo-handle="${i}">${p.id}</button></div>`).join('');mountPhotoOrder(host,photos,render);};render();return {dom,doc,host,photos};}
function pointer(w,type,props={}){const event=new w.Event(type,{bubbles:true,cancelable:true});Object.assign(event,{button:0,pointerId:1,clientX:20,clientY:20,...props});return event;}
test('pointer drag moves a photo to its selected position; cancel preserves order',()=>{
 const {dom,doc,host,photos}=setup();let handle=host.querySelector('[data-photo-handle="2"]');doc.elementFromPoint=()=>host.querySelector('[data-photo-index="0"]');handle.dispatchEvent(pointer(dom.window,'pointerdown'));handle.dispatchEvent(pointer(dom.window,'pointermove'));handle.dispatchEvent(pointer(dom.window,'pointerup'));assert.deepEqual(photos.map(p=>p.id),['c','a','b']);
 handle=host.querySelector('[data-photo-handle="2"]');handle.dispatchEvent(pointer(dom.window,'pointerdown'));handle.dispatchEvent(pointer(dom.window,'pointermove'));handle.dispatchEvent(pointer(dom.window,'pointercancel'));assert.deepEqual(photos.map(p=>p.id),['c','a','b']);dom.window.close();
});
