import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {paymentLabel} from '../assets/wash-payment.js';
import * as shared from '../assets/wash-shared.js';
const source=(await readFile(new URL('../assets/wash.js',import.meta.url),'utf8')).replace(/^import .*;\n/,'const {washServices,vehicleSizes,distanceKm,pointInZone,wazeLinks,washMoney,bakuTime}=shared;\n').replace("import {paymentLabel} from './wash-payment.js';",'').replace('export async function carwash','async function carwash')+'\nreturn carwash(args);';
const shop={id:'shop',title:'Yuma <img src=x onerror=alert(1)>',phone:'+994501234567',address:'Test küçəsi',latitude:40.4,longitude:49.8,services:{exterior:{standard:1000,suv:1500,minutes:20},interior:{standard:500,suv:700,minutes:15}},cash_enabled:true,next_start:'2026-10-01T10:00:00+04:00',next_available:1};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function setup(){
 const dom=new JSDOM('<main></main>',{url:'https://sosavto.test/avtoyuma.html',pretendToBeVisual:true}),w=dom.window;
 w.HTMLElement.prototype.scrollIntoView=function(){};
 let gps,clock,available=1,holds=0;const errors=[];
 Object.defineProperty(w.navigator,'geolocation',{value:{watchPosition(cb){gps=cb;return 1;},clearWatch(){}}});
 const args={main:w.document.querySelector('main'),me:{id:'customer',phone:'+994501234567'},config:{wash:true},esc,toast:t=>errors.push(t),task:async(b,fn)=>{if(b)b.disabled=true;try{return await fn();}catch(e){errors.push(e.message);}finally{if(b)b.disabled=false;}},api:async(path,method,data)=>{
 if(path==='/wash/shops')return {shops:[{...shop,next_available:available,next_start:available?shop.next_start:null}]};
 if(path==='/wash/zones')return {zones:[{name:'Test zona',ring:[[49,40],[50,40],[50,41],[49,41],[49,40]]}]};
 if(path==='/wash/bookings')return {bookings:[]};
 if(path==='/wash/shops/shop/slots')return {slots:[{id:'slot',starts_at:shop.next_start,ends_at:'2026-10-01T11:00:00+04:00',available,closed:false}]};
 if(path==='/wash/hold'){holds++;assert.equal(data.expected_total_cents,2200);available=0;return {booking:{id:'book'}};}
 throw Error('Unexpected '+path);
 }};
 const run=new Function('window','document','location','navigator','crypto','setInterval','clearInterval','shared','args','paymentLabel',source);
 await run(w,w.document,w.location,w.navigator,w.crypto,fn=>{clock=fn;return 1;},()=>{},shared,args,paymentLabel);
 const flush=()=>new Promise(r=>setImmediate(r));
 return {w,doc:w.document,errors,gps:p=>gps(p),tick:async()=>{clock();await flush();},flush,setAvailable:n=>available=n,holds:()=>holds,close:()=>w.close()};
}
test('cards escape names, expose Waze/call/WhatsApp, and live GPS updates zone and distance',async()=>{const d=await setup();assert.equal(d.doc.querySelectorAll('img').length,0);assert.ok(d.doc.querySelector('a[href^="waze://"]'));assert.ok(d.doc.querySelector('a[href^="tel:"]'));assert.ok(d.doc.querySelector('a[href^="https://wa.me/"]'));d.doc.querySelector('#wash-gps').click();d.gps({coords:{latitude:40.4,longitude:49.8,accuracy:10}});assert.match(d.doc.querySelector('#wash-location').textContent,/Test zona/);assert.match(d.doc.querySelector('#wash-cards').textContent,/0.0 km/);d.setAvailable(0);await d.tick();assert.equal(d.doc.querySelector('[data-shop]').disabled,true);d.close();});
test('size/extras price updates and a successful last-slot hold leaves reserve disabled',async()=>{const d=await setup();d.doc.querySelector('[data-shop]').click();await d.flush();const f=d.doc.querySelector('#wash-reserve-form');assert.equal(f.querySelector('[value=card]').disabled,true);assert.equal(f.elements.method.value,'cash');f.elements.size.value='suv';f.querySelector('[value=interior]').checked=true;f.querySelector('#wash-slot').value='slot';f.dispatchEvent(new d.w.Event('change'));assert.match(d.doc.querySelector('#wash-total').textContent,/22.00/);assert.equal(d.doc.querySelector('#wash-reserve').disabled,false);f.dispatchEvent(new d.w.Event('submit',{cancelable:true}));await d.flush();await d.flush();assert.equal(d.holds(),1);assert.equal(d.doc.querySelector('#wash-reserve').disabled,true);assert.equal(d.errors.filter(x=>x.includes('Unexpected')).length,0);d.close();});
