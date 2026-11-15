import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {mountTikTokPreparation} from '../assets/tiktok-prepare.js';
test('TikTok preparation copies edited text and exposes images without publishing',async()=>{
 const dom=new JSDOM('<main></main>',{url:'https://sosavto.az/admin.html'}),w=dom.window;
 globalThis.document=w.document;globalThis.location=w.location;
 let copied;Object.defineProperty(globalThis,'navigator',{value:{clipboard:{writeText:async value=>{copied=value;}}},configurable:true});
 const host=w.document.querySelector('main');mountTikTokPreparation(host,{caption:'Lada 17900 AZN',images:['https://images.test/a.webp','https://images.test/b.webp','javascript:alert(1)']});
 assert.equal(host.querySelectorAll('a').length,3);assert.equal(host.querySelectorAll('a[href^="javascript:"]').length,0);
 assert.match(host.textContent,/son paylaşımı TikTok-da/);
 host.querySelector('textarea').value='Edited caption';await host.querySelector('button').onclick();assert.equal(copied,'Edited caption');assert.match(host.querySelector('[role=status]').textContent,/kopyalandı/);dom.window.close();
});
test('clipboard failure selects text; missing images are explained',async()=>{
 const dom=new JSDOM('<main></main>',{url:'https://sosavto.az/admin.html'}),w=dom.window;globalThis.document=w.document;globalThis.location=w.location;
 Object.defineProperty(globalThis,'navigator',{value:{clipboard:{writeText:async()=>{throw Error('denied');}}},configurable:true});
 const host=w.document.querySelector('main');mountTikTokPreparation(host,{caption:'Text'});await host.querySelector('button').onclick();assert.match(host.textContent,/şəkil yoxdur/);assert.match(host.querySelector('[role=status]').textContent,/əl ilə/);dom.window.close();
});
test('social studio prepares TikTok while Meta controls keep their publishing flow',async()=>{
 const dom=new JSDOM('<main><div data-ops="business"></div><div data-ops="marketing"></div><div data-ops="android"></div></main>',{url:'https://sosavto.az/admin.html'}),w=dom.window;
 globalThis.document=w.document;globalThis.location=w.location;globalThis.window=w;
 const calls=[];globalThis.fetch=async(url,options={})=>{calls.push({url,options});let data={};
  if(url==='/api/admin/operations')data={users:[],business:[],android:[]};
  else if(url==='/api/admin/social-listings')data={enabled:true,configured:{instagram:true,facebook:true},listings:[{id:'one',title:'Lada',price:17900}]};
  else if(url.startsWith('/api/admin/social-preview'))data={preview:{caption:'Lada caption',imageUrl:'https://images.test/a.webp',images:['https://images.test/a.webp']}};
  else if(url==='/api/dealerships/admin')data={profiles:[]};
  return {ok:true,json:async()=>data};
 };
 const {mountOperations}=await import('../assets/admin-operations.js');await mountOperations(w.document.querySelector('main'));
 const root=w.document.querySelector('[data-ops=marketing]');root.querySelector('[data-network=tiktok]').click();root.querySelector('[data-listing]').click();await new Promise(r=>setImmediate(r));
 assert.ok(root.querySelector('.social-tiktok-caption'));assert.match(root.querySelector('#social-status').textContent,/Birbaşa paylaşım qoşulmayıb/);
 assert.equal(calls.some(c=>c.url==='/api/admin/social-publish'),false);
 root.querySelector('[data-network=instagram]').click();await new Promise(r=>setImmediate(r));
 assert.equal(root.querySelector('.social-tiktok-caption'),null);assert.equal(root.querySelector('#social-preview-result button').textContent,'Instagram-da paylaş');
 assert.equal(root.querySelector('#social-preview-result button').disabled,false);dom.window.close();
});
