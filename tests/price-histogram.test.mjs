import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {JSDOM} from 'jsdom';
import {priceHistogram} from '../server/price-histogram.mjs';
import {mountPriceHistogram} from '../assets/price-histogram.js';

test('histogram counts all active matches, ignores price/pagination and respects other filters',async()=>{
 const db=new PGlite();try{
 await db.exec('CREATE TABLE listings(price numeric,status text,category text,brand text,city text)');
 await db.exec("INSERT INTO listings SELECT n*100,'active','car','BMW','Bakı' FROM generate_series(0,30) n; INSERT INTO listings VALUES(999999,'pending','car','BMW','Bakı'),(10,'active','parts','BMW','Bakı'),(50,'active','car','Toyota','Bakı')");
 const query=(...args)=>db.query(...args);
 const h=await priceHistogram(query,new URLSearchParams('category=car&brand=BMW&price_min=2000&price_max=1000&page=2'));
 assert.equal(h.total,31);assert.equal(h.min,0);assert.equal(h.max,3000);assert.equal(h.bins.length,20);assert.equal(h.bins.reduce((s,b)=>s+b.count,0),31);assert.ok(h.bins[19].count>0);
 const single=await priceHistogram(query,new URLSearchParams('brand=Toyota'));assert.equal(single.bins.length,1);assert.equal(single.min,50);assert.equal(single.max,50);
 const empty=await priceHistogram(query,new URLSearchParams('city=Gəncə'));assert.deepEqual(empty,{total:0,min:null,max:null,bins:[]});
 }finally{await db.close();}
});
const data={total:3,min:100,max:300,bins:[{from:100,to:200,count:2},{from:200,to:300,count:1}]};
function fixture(){const dom=new JSDOM('<form><input name="price_min" type="number"><input name="price_max" type="number"><select name="brand"><option>BMW</option></select><section></section></form>');return {dom,form:dom.window.document.querySelector('form'),host:dom.window.document.querySelector('section')};}
const tick=()=>new Promise(r=>setImmediate(r));
test('sliders and manual values synchronize without silently changing outside-range filters',async()=>{
 const {dom,form,host}=fixture();try{
 form.elements.price_min.value='50';mountPriceHistogram(host,form,async()=>data,()=>new URLSearchParams());await tick();
 assert.equal(form.elements.price_min.value,'50');const sliders=host.querySelectorAll('[type=range]');assert.equal(sliders[0].value,'100');
 sliders[0].value='175';sliders[0].dispatchEvent(new dom.window.Event('input'));assert.equal(form.elements.price_min.value,'175');
 form.elements.price_max.value='180';form.elements.price_max.dispatchEvent(new dom.window.Event('input'));assert.equal(sliders[1].value,'180');
 sliders[0].value='250';sliders[0].dispatchEvent(new dom.window.Event('input'));assert.equal(form.elements.price_min.value,'180');
 form.elements.price_min.value='';form.elements.price_min.dispatchEvent(new dom.window.Event('input'));assert.equal(sliders[0].value,'100');assert.match(host.textContent,/Minimum yoxdur/);
 assert.equal(new dom.window.FormData(form).get('price_max'),'180');assert.match(host.querySelector('[role=img]').getAttribute('aria-label'),/3 elan/);
 }finally{dom.window.close();}
});
test('stale responses cannot overwrite new filter results, errors leave manual fields usable',async()=>{
 const {dom,form,host}=fixture();try{
 const requests=[];const picker=mountPriceHistogram(host,form,()=>new Promise((resolve,reject)=>requests.push({resolve,reject})),()=>new URLSearchParams());
 const next=picker.refresh();requests[1].resolve({...data,total:0,bins:[],min:null,max:null});await next;requests[0].resolve(data);await tick();assert.ok(host.querySelector('.price-distribution-controls').hidden);assert.match(host.textContent,/real elan yoxdur/);
 const failed=picker.refresh();requests[2].reject(new Error('offline'));await failed;assert.match(host.textContent,/yüklənmədi/);assert.equal(form.elements.price_min.disabled,false);
 const single=picker.refresh();requests[3].resolve({total:1,min:25,max:25,bins:[{from:25,to:25,count:1}]});await single;assert.ok(host.querySelector('[type=range]').disabled);
 }finally{dom.window.close();}
});
