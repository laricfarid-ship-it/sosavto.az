import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {randomUUID} from 'node:crypto';
import {quoteRental,rentalToday,rentalStatus} from '../assets/rentacar-shared.js';
const html=await readFile(new URL('../rentacar.html',import.meta.url),'utf8');
const source=(await readFile(new URL('../assets/rentacar.js',import.meta.url),'utf8')).replace("import {mountRentalWorkspace} from './rentacar-workspace.js';","const mountRentalWorkspace=async pane=>{pane.textContent='İcarə paneli test rejimindədir. Real elan və rezervasiya qəbul edilmir.';};").replace("import {quoteRental,rentalToday,rentalStatus} from './rentacar-shared.js';",'').replace(/init\(\);\s*$/,'return init();');
const future=n=>new Date(Date.parse(rentalToday())+n*86400000).toISOString().slice(0,10);
async function load(path='',responses={}){
 const dom=new JSDOM(html,{url:'https://sosavto.test/rentacar.html'+path}),w=dom.window,calls=[];w.HTMLElement.prototype.scrollIntoView=()=>{};w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 const fetch=async(path,opts={})=>{calls.push({path,...opts});const b=responses[path]??(path==='/api/rentacar/config'?{enabled:false}:null);if(!b)throw Error('Unexpected API: '+path);return {ok:!b.error,json:async()=>b};};
 const run=new Function('document','location','crypto','fetch','FormData','quoteRental','rentalToday','rentalStatus',source);
 await run(w.document,w.location,{randomUUID},fetch,w.FormData,quoteRental,rentalToday,rentalStatus);
 const tick=()=>new Promise(r=>setImmediate(r));return {w,doc:w.document,calls,tick,close:()=>w.close()};
}
test('rental HTML uses only CSP-compatible external scripts, accessible dialog and scoped stylesheet',()=>{
 const d=new JSDOM(html);assert.equal(d.window.document.querySelectorAll('script:not([src])').length,0);assert.equal(d.window.document.querySelectorAll('[onclick],[onerror],[onsubmit]').length,0);assert.equal(d.window.document.querySelector('script').getAttribute('src'),'assets/rentacar.js');assert.equal(d.window.document.querySelector('link[rel=stylesheet]').getAttribute('href'),'assets/rentacar.css');assert.equal(d.window.document.querySelector('dialog').getAttribute('aria-labelledby'),'detail-title');d.window.close();
});
test('preview is explicitly sample-only, shows real photo assets and never requests user data',async()=>{
 const d=await load();try{assert.equal(d.doc.querySelectorAll('.car-card').length,3);assert.match(d.doc.querySelector('#mode').textContent,/nümunədir/);assert.equal(d.calls.length,1);assert.equal(d.doc.querySelectorAll('.car-card img[src$=".jpg"]').length,3);d.doc.querySelector('#workspace-open').click();await d.tick();assert.match(d.doc.querySelector('#workspace-content').textContent,/test rejimindədir/);assert.equal(d.doc.querySelector('#profile-form'),null);}finally{d.close();}
});
test('sample search filters city/type and period switching changes the visible prices',async()=>{
 const d=await load();try{const f=d.doc.querySelector('#searchForm');f.elements.start.value=future(2);f.elements.end.value=future(9);f.elements.city.value='Sumqayıt';f.dispatchEvent(new d.w.Event('submit',{cancelable:true}));await d.tick();assert.equal(d.doc.querySelectorAll('.car-card').length,1);assert.match(d.doc.querySelector('.car-card h3').textContent,/BMW/);d.doc.querySelector('[data-period=weekly]').click();assert.match(d.doc.querySelector('.price').textContent,/950/);assert.equal(d.doc.querySelector('[data-period=weekly]').getAttribute('aria-pressed'),'true');assert.equal(d.calls.length,1);}finally{d.close();}
});
test('details show prices, deposit, unique share link and calculate dates while real booking stays disabled',async()=>{
 const d=await load('?car=demo-porsche');try{assert.equal(d.doc.querySelector('dialog').open,true);assert.match(d.doc.querySelector('#detail-title').textContent,/Porsche/);assert.match(d.doc.querySelector('[aria-label="Elanın keçidi"]').value,/car=demo-porsche/);const f=d.doc.querySelector('.booking-form');f.elements.start.value=future(2);f.elements.end.value=future(9);f.dispatchEvent(new d.w.Event('input'));assert.match(f.querySelector('.booking-summary').textContent,/7 gün/);assert.equal(f.querySelector('button').disabled,true);f.dispatchEvent(new d.w.Event('submit',{cancelable:true}));await d.tick();assert.equal(d.calls.length,1);}finally{d.close();}
});
test('failed config never silently fabricates a live inventory',async()=>{const d=await load('',{'/api/rentacar/config':{error:'Unavailable'}});try{assert.equal(d.doc.querySelectorAll('.car-card').length,0);assert.match(d.doc.querySelector('#mode').textContent,/Unavailable/);}finally{d.close();}});
test('live inventory escapes seller content and booking submits real API request before showing pending status',async()=>{
 const car={id:'11111111-1111-4111-8111-111111111111',listing_number:42,title:'<script>bad()</script>',year:2023,city:'Bakı',vehicle_type:'premium',images:['https://example.test/car.jpg'],daily_cents:10000,weekly_cents:60000,monthly_cents:200000,deposit_cents:50000,owner_name:'Owner',owner_kind:'individual',owner_phone:'+994501234567',terms:'Minimum age 25 and three years driving experience.'};
 const d=await load('',{'/api/rentacar/config':{enabled:true},'/api/rentacar/cars':{cars:[car]},'/api/me':{user:{id:'other',role:'user'}},'/api/rentacar/bookings':{booking:{id:'booking',status:'pending'}}});
 try{assert.equal(d.doc.querySelectorAll('#cars script').length,0);d.doc.querySelector('[data-car]').click();const f=d.doc.querySelector('.booking-form');f.elements.start.value=future(2);f.elements.end.value=future(9);f.dispatchEvent(new d.w.Event('input'));f.dispatchEvent(new d.w.Event('submit',{cancelable:true}));await d.tick();await d.tick();const r=d.calls.find(c=>c.path==='/api/rentacar/bookings');assert.equal(r.method,'POST');assert.equal(JSON.parse(r.body).expected_total_cents,60000);assert.match(d.doc.querySelector('.booking-status').textContent,/Yoxlanılır/);assert.equal(d.doc.querySelectorAll('#detail script').length,0);}finally{d.close();}
});
