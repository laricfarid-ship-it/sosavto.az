import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {mountRentalWorkspace} from '../assets/rentacar-workspace.js';
import {mountRentalAdmin} from '../assets/rentacar-admin.js';
const ownerUser={id:'owner',fullname:'Owner',phone:'+994501234567',role:'user'};
const car={id:'car',listing_number:7,title:'Premium Car',year:2023,city:'Bakı',vehicle_type:'premium',images:['https://example.test/car.jpg'],status:'active',daily_cents:10000,weekly_cents:60000,monthly_cents:200000,deposit_cents:50000,terms:'Test rental terms for approved owner.'};
async function setup(responses){
 const dom=new JSDOM('<html><head></head><body><section id="pane"></section></body></html>',{url:'https://sosavto.test/rentacar.html'}),w=dom.window;w.HTMLElement.prototype.scrollIntoView=()=>{};
 const calls=[],oldFetch=globalThis.fetch,oldForm=globalThis.FormData;
 globalThis.FormData=w.FormData;globalThis.fetch=async(path,options={})=>{calls.push({path,...options});const data=responses[path];if(!data)throw Error('Unexpected '+path);return {ok:!data.error,json:async()=>data};};
 return {w,pane:w.document.querySelector('#pane'),calls,tick:async()=>{for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r));},close(){globalThis.fetch=oldFetch;globalThis.FormData=oldForm;w.close();}};
}
test('anonymous rental workspace uses existing sign-in without exposing owner/admin data',async()=>{const d=await setup({});try{await mountRentalWorkspace(d.pane,{enabled:true,user:null});assert.match(d.pane.textContent,/daxil ol/);assert.equal(d.calls.length,0);assert.ok(d.pane.querySelector('a[href^="giris.html?next="]'));}finally{d.close();}});
test('owner panel submits verification request and keeps admin management centralized',async()=>{
 const data={'/api/rentacar/owner':{profile:null,cars:[],bookings:[]},'/api/rentacar/bookings':{bookings:[]},'/api/rentacar/profile':{profile:{status:'pending'}}};const d=await setup(data);
 try{await mountRentalWorkspace(d.pane,{enabled:true,user:ownerUser});assert.equal(d.pane.querySelector('a[href^="admin.html"]'),null);d.pane.querySelector('[data-tab=profile]').click();const f=d.pane.querySelector('[data-profile]');f.elements.phone.value='+994501234567';f.dispatchEvent(new d.w.Event('submit',{cancelable:true,bubbles:true}));await d.tick();const c=d.calls.find(c=>c.method==='POST');assert.equal(c.path,'/api/rentacar/profile');assert.equal(JSON.parse(c.body).kind,'company');assert.match(d.pane.querySelector('[data-feedback]').textContent,/yoxlamaya/);}finally{d.close();}
});
test('owner can edit existing car and send a new moderated revision with all price periods',async()=>{
 const data={'/api/rentacar/owner':{profile:{user_id:'owner',kind:'company',name:'Rental Co',status:'approved'},cars:[car],bookings:[]},'/api/rentacar/bookings':{bookings:[]},'/api/rentacar/cars/car':{car:{...car,status:'pending'}}};const d=await setup(data);
 try{await mountRentalWorkspace(d.pane,{enabled:true,user:ownerUser});d.pane.querySelector('[data-edit]').click();const f=d.pane.querySelector('[data-car-form]');f.elements.title.value='Updated Car';f.dispatchEvent(new d.w.Event('submit',{cancelable:true,bubbles:true}));await d.tick();const c=d.calls.find(c=>c.method==='PUT');assert.equal(c.path,'/api/rentacar/cars/car');assert.equal(JSON.parse(c.body).monthly_cents,200000);assert.equal(JSON.parse(c.body).title,'Updated Car');}finally{d.close();}
});
test('premium admin panel has grouped tabs, review form and explicit verification checkbox',async()=>{
 const d=await setup({'/api/rentacar/config':{enabled:true},'/api/rentacar/admin':{profiles:[{user_id:'owner',name:'Rental Co',kind:'company',status:'pending',phone:'+994501234567',city:'Bakı'}],cars:[car],bookings:[],audit:[]},'/api/rentacar/admin/profiles/owner':{record:{status:'approved'}}});
 try{await mountRentalAdmin(d.pane);assert.equal(d.pane.querySelectorAll('[role=tab]').length,4);assert.equal(d.pane.querySelectorAll('.rp-metric').length,4);d.pane.querySelector('[data-action=approved]').click();const f=d.pane.querySelector('[data-decision]');assert.equal(f.querySelector('[type=checkbox]').required,true);f.elements.note.value='İcarə səlahiyyəti yoxlanıldı.';f.querySelector('[type=checkbox]').checked=true;f.dispatchEvent(new d.w.Event('submit',{cancelable:true}));await d.tick();const c=d.calls.find(c=>c.method==='PATCH');assert.equal(JSON.parse(c.body).status,'approved');d.pane.querySelector('[data-tab=cars]').click();assert.match(d.pane.querySelector('[data-list]').textContent,/Premium Car/);}finally{d.close();}
});
