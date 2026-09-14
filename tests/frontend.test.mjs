import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {cars} from '../assets/cars.js';
const source=(await readFile(new URL('../assets/app.js',import.meta.url),'utf8')).replace("import {cars} from './cars.js';",'').replace('init().catch(e=>errorBox(main,e));','return init();');
const user={id:'11111111-1111-4111-8111-111111111111',fullname:'Test Owner',username:'owner',email:'owner@example.test',phone:'',role:'user'};
const listing={id:'22222222-2222-4222-8222-222222222222',user_id:user.id,title:'BMW <script>alert(1)</script>',category:'car',description:'Test avtomobil haqqında ətraflı məlumat.',brand:'BMW',model:'5 Series',year:2018,mileage:90000,city:'Bakı',phone:'+994501234567',price:23000,status:'active',views:4,favorite_count:1,images:[],details:{},created_at:new Date().toISOString(),seller:'Test Owner'};
async function load(path,me=null,responses={}){
 const dom=new JSDOM('<html><head><meta name="description" content=""></head><body><header id="header"></header><main id="main"></main><footer id="footer"></footer><dialog id="dialog"></dialog><div id="toast"></div></body></html>',{url:'https://sosavto.test/'+path});
 const w=dom.window;const calls=[];const fetch=async(url,options={})=>{calls.push({url,...options});const path=url.replace('/api','');const result=responses[path]||({'/me':{user:me},'/config':{ai:false,uploads:false},'/favorites':{listings:[]},'/my-listings':{listings:[]},'/listings?':{listings:[],total:0,page:1,pages:0}}[path]);if(!result)throw Error('Unexpected API request: '+path);return {ok:!result.error,status:result.error?503:200,json:async()=>result};};
 w.L={map:()=>({setView(){return this;},on(){},removeLayer(){},fitBounds(){},invalidateSize(){}}),tileLayer:()=>({addTo(){}}),marker:()=>({addTo(){return this;},bindPopup(){return this;},getLatLng(){return [40,49];},openPopup(){}})};
 const run=new Function('window','document','location','navigator','localStorage','sessionStorage','fetch','FormData','cars','setTimeout','clearTimeout',source);
 await run(w,w.document,w.location,w.navigator,w.localStorage,w.sessionStorage,fetch,w.FormData,cars,()=>0,()=>{});return {w,doc:w.document,calls,close:()=>dom.window.close()};
}
test('home builds dependent model filter from URL regardless of query parameter order',async()=>{
 const path='index.html?model=Elantra&brand=Hyundai&year_min=2018';const d=await load(path,null,{'/listings?model=Elantra&brand=Hyundai&year_min=2018':{listings:[],total:0,page:1,pages:0}});
 assert.equal(d.doc.querySelector('[name=model]').value,'Elantra');assert.equal(d.doc.querySelector('[name=year_min]').value,'2018');assert.match(d.doc.querySelector('#results').textContent,/Uyğun elan tapılmadı/);d.close();
});
test('user listing content is escaped rather than rendered as HTML',async()=>{const d=await load('index.html',null,{'/listings?':{listings:[listing],total:1,page:1,pages:1}});assert.equal(d.doc.querySelectorAll('#results script').length,0);assert.ok(d.doc.querySelector('#results').textContent.includes('<script>'));assert.equal(d.doc.querySelector('[data-fav]').getAttribute('aria-pressed'),'false');d.close();});
test('API failure has an error state, not fabricated listings',async()=>{const d=await load('index.html',null,{'/listings?':{error:'Database unavailable'}});assert.match(d.doc.querySelector('#results').textContent,/Database unavailable/);assert.ok(d.doc.querySelector('#retry'));assert.equal(d.doc.querySelectorAll('.card').length,0);d.close();});
test('anonymous users are redirected to sign-in flow for owner pages',async()=>{const d=await load('menim-elanlarim.html');assert.ok(d.doc.querySelector('a[href^="giris.html?next="]'));assert.equal(d.calls.some(c=>c.url==='/api/my-listings'),false);d.close();});
test('listing form toggles required vehicle fields and normalizes category names',async()=>{const d=await load('elan-ver.html',user);const form=d.doc.querySelector('#listing-form');assert.ok(form.elements.year.required);form.elements.category.value='parts';form.elements.category.dispatchEvent(new d.w.Event('change'));assert.equal(form.elements.year.required,false);assert.equal(d.doc.querySelector('#vehicle').hidden,true);assert.ok(![...form.elements.category.options].some(x=>x.value==='spare'));assert.equal(d.doc.querySelector('#files').disabled,true);d.close();});
test('detail page shows contact actions and escaped description',async()=>{const d=await load('elan.html?id='+listing.id,null,{['/listings/'+listing.id]:{listing}});assert.ok(d.doc.querySelector('a[href="tel:+994501234567"]'));assert.ok(d.doc.querySelector('a[href="https://wa.me/994501234567"]'));assert.equal(d.doc.querySelectorAll('#main script').length,0);d.close();});
test('admin content is denied for ordinary accounts',async()=>{const d=await load('admin.html',user);assert.match(d.doc.querySelector('#main').textContent,/icazəniz yoxdur/);assert.equal(d.calls.some(c=>c.url==='/api/admin'),false);d.close();});
test('AI controls honestly remain disabled until configured',async()=>{const d=await load('ai.html',user);assert.match(d.doc.querySelector('#main').textContent,/hələ aktivləşdirilməyib/);assert.equal(d.doc.querySelector('#chat-form button').disabled,true);d.close();});
test('service categories discard vehicle filters and show real contact data safely',async()=>{
 for(const category of ['wash','service','detailing']){
 const d=await load('index.html?category='+category+'&brand=BMW&year_min=2020',null,{['/map?category='+category]:{listings:[{...listing,category,latitude:40.4,longitude:49.8,address:'Test ünvan',details:{hours:'09:00–19:00'}}]}});
 assert.equal(d.doc.querySelector('[name=brand]'),null);assert.equal(d.doc.querySelector('[name=year_min]'),null);
 assert.equal(d.doc.querySelectorAll('#service-list script').length,0);assert.match(d.doc.querySelector('#service-list').textContent,/09:00–19:00/);
 assert.ok(d.doc.querySelector('a[href="tel:+994501234567"]'));assert.ok(d.doc.querySelector('a[href^="https://www.google.com/maps/dir/"]'));
 d.doc.querySelector('[data-map-id]').click();assert.equal(d.doc.querySelector('.service-layout').dataset.view,'map');
 let asked=0;Object.defineProperty(d.w.navigator,'geolocation',{value:{getCurrentPosition(success,failure){asked++;failure();}}});
 assert.equal(asked,0);d.doc.querySelector('#service-nearby').click();assert.equal(asked,1);assert.match(d.doc.querySelector('#location-message').textContent,/Şəhəri əl ilə/);d.close();
 }
});
test('nearby sorting and radius exclude distant services after explicit location consent',async()=>{
 const near={...listing,id:'near',latitude:40.4,longitude:49.8,category:'wash'},far={...listing,id:'far',latitude:41.4,longitude:49.8,category:'wash'};
 const d=await load('index.html?category=wash',null,{'/map?category=wash':{listings:[far,near]}});
 d.w.L.circleMarker=d.w.L.marker;
 Object.defineProperty(d.w.navigator,'geolocation',{value:{getCurrentPosition(success){success({coords:{latitude:40.4,longitude:49.8}});}}});
 d.doc.querySelector('#service-nearby').click();assert.equal(d.doc.querySelector('.service-card').id,'service-near');
 const radius=d.doc.querySelector('#service-radius');radius.value='5';radius.dispatchEvent(new d.w.Event('change'));assert.equal(d.doc.querySelectorAll('.service-card').length,1);d.close();
});
test('service failure is reported without fabricated results',async()=>{
 const d=await load('index.html?category=wash',null,{'/map?category=wash':{error:'Database unavailable'}});assert.match(d.doc.querySelector('#service-list').textContent,/Database unavailable/);assert.equal(d.doc.querySelectorAll('.service-card').length,0);d.close();
});
