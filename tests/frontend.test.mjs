import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {cars} from '../assets/cars.js';
import * as catalog from '../assets/catalog.js';
import * as credit from '../assets/credit.js';
import * as discovery from '../assets/discovery.js';
const source=(await readFile(new URL('../assets/app.js',import.meta.url),'utf8')).replace("import {creditMarkup,mountCredit} from './credit.js';",'const {creditMarkup,mountCredit}=credit;').replace("import {bodyChoices,chipMarkup,comparisonIds,vehicleHighlights} from './discovery.js';",'const {bodyChoices,chipMarkup,comparisonIds,vehicleHighlights}=discovery;').replace("import {mountDemoListings} from './demo-listings.js';",'const mountDemoListings=()=>{};').replace("import {groupMapListings,mapKinds} from './service-map.js';",'').replace("import {cars} from './cars.js';",'').replace("import {partTypes,insuranceTypes,serviceTypes,detailFields,detailLabels,plateNotice,filterKeys} from './catalog.js';",'const {partTypes,insuranceTypes,serviceTypes,detailFields,detailLabels,plateNotice,filterKeys}=catalog;').replace('init().catch(e=>errorBox(main,e));','return init();');
const user={id:'11111111-1111-4111-8111-111111111111',fullname:'Test Owner',username:'owner',email:'owner@example.test',phone:'',role:'user'};
const listing={id:'22222222-2222-4222-8222-222222222222',user_id:user.id,title:'BMW <script>alert(1)</script>',category:'car',description:'Test avtomobil haqqında ətraflı məlumat.',brand:'BMW',model:'5 Series',year:2018,mileage:90000,city:'Bakı',phone:'+994501234567',price:23000,status:'active',views:4,favorite_count:1,images:[],details:{},created_at:new Date().toISOString(),seller:'Test Owner'};
async function load(path,me=null,responses={}){
 const dom=new JSDOM('<html><head><meta name="description" content=""></head><body><header id="header"></header><main id="main"></main><footer id="footer"></footer><dialog id="dialog"></dialog><div id="toast"></div></body></html>',{url:'https://sosavto.test/'+path});
 const w=dom.window;const calls=[];const fetch=async(url,options={})=>{calls.push({url,...options});const path=url.replace('/api','');const result=responses[path]||({'/me':{user:me},'/config':{ai:false,uploads:false},'/favorites':{listings:[]},'/my-listings':{listings:[]},'/listings?category=car':{listings:[],total:0,page:1,pages:0}}[path]);if(!result)throw Error('Unexpected API request: '+path);return {ok:!result.error,status:result.error?503:200,json:async()=>result};};
 w.L={map:()=>({setView(){return this;},on(event,handler){w.mapHandlers??={};w.mapHandlers[event]=handler;},removeLayer(){},fitBounds(){},invalidateSize(){}}),tileLayer:()=>({addTo(){}}),marker:()=>({addTo(){return this;},bindPopup(){return this;},getLatLng(){return [40,49];},openPopup(){}})};
 const run=new Function('window','document','location','navigator','localStorage','sessionStorage','fetch','FormData','cars','catalog','discovery','credit','setTimeout','clearTimeout',source);
 await run(w,w.document,w.location,w.navigator,w.localStorage,w.sessionStorage,fetch,w.FormData,cars,catalog,discovery,credit,()=>0,()=>{});return {w,doc:w.document,calls,close:()=>dom.window.close()};
}
test('home builds dependent model filter from URL regardless of query parameter order',async()=>{
 const path='index.html?model=Elantra&brand=Hyundai&year_min=2018';const d=await load(path,null,{'/listings?model=Elantra&brand=Hyundai&year_min=2018&category=car':{listings:[],total:0,page:1,pages:0}});
 assert.equal(d.doc.querySelector('[name=model]').value,'Elantra');assert.equal(d.doc.querySelector('[name=year_min]').value,'2018');assert.match(d.doc.querySelector('#results').textContent,/Uyğun elan tapılmadı/);d.close();
});
test('user listing content is escaped rather than rendered as HTML',async()=>{const d=await load('index.html',null,{'/listings?category=car':{listings:[listing],total:1,page:1,pages:1}});assert.equal(d.doc.querySelectorAll('#results script').length,0);assert.ok(d.doc.querySelector('#results').textContent.includes('<script>'));assert.equal(d.doc.querySelector('[data-fav]').getAttribute('aria-pressed'),'false');d.close();});
test('API failure has an error state, not fabricated listings',async()=>{const d=await load('index.html',null,{'/listings?category=car':{error:'Database unavailable'}});assert.match(d.doc.querySelector('#results').textContent,/Database unavailable/);assert.ok(d.doc.querySelector('#retry'));assert.equal(d.doc.querySelectorAll('.card').length,0);d.close();});
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

test('manual map selection centers a 3km search and clears an unrelated city filter',async()=>{
 const near={...listing,id:'near',latitude:40.4,longitude:49.8,category:'wash'};
 const d=await load('index.html?category=wash&city=Gəncə',null,{'/map?category=wash&city=G%C9%99nc%C9%99':{listings:[]},'/map?category=wash':{listings:[near]}});
 d.w.L.circleMarker=d.w.L.marker;
 await d.w.mapHandlers.click({latlng:{lat:40.4,lng:49.8}});
 assert.equal(d.doc.querySelector('[name=city]').value,'');
 assert.equal(d.doc.querySelector('#service-radius').value,'3');
 assert.equal(d.doc.querySelector('#service-sort').value,'distance');
 assert.equal(d.doc.querySelector('.service-card').id,'service-near');
 assert.match(d.doc.querySelector('#location-message').textContent,/Xəritədə seçdiyiniz/);d.close();
});

test('parts, insurance and plates expose only category-specific search fields',async()=>{
 for(const [category,field]of [['parts','oem'],['insurance','insurance_type'],['plates','plate_region']]){
  const d=await load('index.html?category='+category+'&year_min=2020&fuel=Dizel',null,{['/listings?category='+category]:{listings:[],total:0,page:1,pages:0}});
  assert.ok(d.doc.querySelector(`[name=${field}]`));assert.equal(d.doc.querySelector('[name=year_min]'),null);assert.equal(d.doc.querySelector('[name=fuel]'),null);
  assert.equal(!!d.doc.querySelector('[name=brand]'),category==='parts');
  assert.equal(d.doc.querySelector('a.accent').getAttribute('href'),'index.html?category='+category);d.close();
 }
});
test('category form deep links and switching disable irrelevant fields without losing compatibility',async()=>{
 const d=await load('elan-ver.html?category=parts',user),f=d.doc.querySelector('#listing-form').elements;
 assert.equal(f.category.value,'parts');assert.equal(f.brand.disabled,false);assert.equal(f.oem.disabled,false);assert.equal(f.year.disabled,true);assert.equal(f.hours.disabled,true);
 f.brand.value='Hyundai';f.brand.dispatchEvent(new d.w.Event('change'));f.model.value='Elantra';
 f.category.value='insurance';f.category.dispatchEvent(new d.w.Event('change'));assert.equal(f.brand.disabled,true);assert.equal(f.oem.disabled,true);assert.equal(f.insurance_type.disabled,false);
 f.category.value='plates';f.category.dispatchEvent(new d.w.Event('change'));assert.equal(f.plate_number.required,true);assert.equal(f.plate_number.disabled,false);
 f.category.value='parts';f.category.dispatchEvent(new d.w.Event('change'));assert.equal(f.brand.value,'Hyundai');assert.equal(f.model.value,'Elantra');assert.equal(f.plate_number.required,false);d.close();
});
test('editing a service retains its type and hours; details render part codes and plate safely',async()=>{
 const service={...listing,category:'wash',details:{service_type:'Kompleks yuma',hours:'09:00–20:00'}};
 const d=await load('elan-ver.html?id='+listing.id,user,{['/listings/'+listing.id]:{listing:service}});
 assert.equal(d.doc.querySelector('[name=service_type]').value,'Kompleks yuma');assert.equal(d.doc.querySelector('[name=hours]').value,'09:00–20:00');d.close();
 const p=await load('elan.html?id='+listing.id,null,{['/listings/'+listing.id]:{listing:{...listing,category:'parts',details:{oem:'2630035505',fitment:'Elantra 2017–2020'}}}});
 assert.match(p.doc.querySelector('.specs').textContent,/2630035505/);assert.doesNotMatch(p.doc.querySelector('.specs').textContent,/Yürüş/);p.close();
});

test('owner delete confirmation sends DELETE, cancellation sends nothing and errors keep the card',async()=>{
 const responses={'/my-listings':{listings:[listing]},['/listings/'+listing.id]:{error:'Aktiv rezervləri əvvəl tamamlayın.'}};
 const d=await load('menim-elanlarim.html',user,responses),dialog=d.doc.querySelector('#dialog');dialog.showModal=()=>{};
 const button=d.doc.querySelector('[data-delete]');
 let pending=button.onclick();assert.equal(button.disabled,true);dialog.returnValue='cancel';dialog.dispatchEvent(new d.w.Event('close'));await pending;
 assert.equal(d.calls.some(c=>c.method==='DELETE'),false);assert.equal(button.disabled,false);
 pending=button.onclick();dialog.returnValue='confirm';dialog.dispatchEvent(new d.w.Event('close'));await pending;
 assert.equal(d.calls.at(-1).method,'DELETE');assert.match(d.doc.querySelector('#toast').textContent,/Aktiv rezerv/);assert.ok(d.doc.querySelector('.card'));assert.equal(button.disabled,false);
 responses['/listings/'+listing.id]={ok:true};responses['/my-listings']={listings:[]};
 pending=button.onclick();dialog.returnValue='confirm';dialog.dispatchEvent(new d.w.Event('close'));await pending;
 assert.equal(d.doc.querySelector('.card'),null);assert.match(d.doc.querySelector('#toast').textContent,/Elan silindi/);d.close();
});
test('owner status action sends PATCH only after confirmation',async()=>{
 const d=await load('menim-elanlarim.html',user,{'/my-listings':{listings:[listing]},['/listings/'+listing.id]:{ok:true}});
 assert.equal(d.doc.querySelector('.item-actions a').getAttribute('href'),'elan-ver.html?id='+listing.id);
 const dialog=d.doc.querySelector('#dialog');dialog.showModal=()=>{};const pending=d.doc.querySelector('[data-status]').onclick();dialog.returnValue='confirm';dialog.dispatchEvent(new d.w.Event('close'));await pending;
 const patch=d.calls.find(c=>c.method==='PATCH');assert.equal(JSON.parse(patch.body).status,'sold');assert.match(d.doc.querySelector('#toast').textContent,/Status yeniləndi/);d.close();
});

test('home defaults to cars; all remains explicit and filters can be removed without losing category',async()=>{
 const d=await load('index.html');assert.equal(d.doc.querySelector('[data-category=car]').getAttribute('aria-pressed'),'true');assert.equal(d.doc.querySelectorAll('[data-body]').length,7);d.close();
 const all=await load('index.html?category=all',null,{'/listings?':{listings:[],total:0,page:1,pages:0}});assert.equal(all.doc.querySelector('[data-category=all]').getAttribute('aria-pressed'),'true');all.close();
 const query='category=car&brand=BMW&model=320&price_min=20000&price_max=30000&fuel=Dizel&page=2';
 const filtered=await load('index.html?'+query,null,{['/listings?'+query]:{listings:[],total:0,page:1,pages:0}});
 const chip=[...filtered.doc.querySelectorAll('.filter-chip')].find(a=>a.textContent.includes('Marka:'));const url=new URL(chip.href);
 assert.equal(url.searchParams.has('brand'),false);assert.equal(url.searchParams.has('model'),false);assert.equal(url.searchParams.has('page'),false);assert.equal(url.searchParams.get('fuel'),'Dizel');assert.equal(url.searchParams.get('category'),'car');assert.equal(filtered.doc.querySelector('.advanced').open,true);filtered.close();
});
test('comparison selection caps at three, toggles and can be cleared without authentication',async()=>{
 const listings=[1,2,3,4].map(n=>({...listing,id:`22222222-2222-4222-8222-${String(n).padStart(12,'0')}`}));
 const d=await load('index.html',null,{'/listings?category=car':{listings,total:4,page:1,pages:1}});
 const buttons=[...d.doc.querySelectorAll('[data-compare]')];buttons.forEach(b=>b.click());
 assert.equal(d.doc.querySelectorAll('[data-compare][aria-pressed=true]').length,3);assert.match(d.doc.querySelector('#toast').textContent,/Maksimum 3/);
 assert.equal(JSON.parse(d.w.sessionStorage.getItem('sosavto_compare_v1')).length,3);assert.ok(d.doc.querySelector('#compare-bar a[href^="muqayise.html?ids="]'));
 buttons[0].click();assert.equal(buttons[0].getAttribute('aria-pressed'),'false');d.doc.querySelector('#compare-clear').click();assert.equal(d.doc.querySelector('#compare-bar').hidden,true);assert.equal(d.doc.querySelectorAll('.compare-selected').length,0);d.close();
});
test('comparison safely renders real data, hides identical rows and tolerates unavailable listings',async()=>{
 const second={...listing,id:'33333333-3333-4333-8333-333333333333',price:27000,details:{fuel:'Dizel'}};
 const third='44444444-4444-4444-8444-444444444444';
 const responses={['/listings/'+listing.id]:{listing},['/listings/'+second.id]:{listing:second},['/listings/'+third]:{error:'Tapılmadı'}};
 const d=await load('muqayise.html?ids='+[listing.id,second.id].join(','),null,responses);
 assert.equal(d.doc.querySelectorAll('.comparison-table thead th').length,3);assert.equal(d.doc.querySelectorAll('#main script').length,0);
 const filter=d.doc.querySelector('#differences');filter.checked=true;filter.dispatchEvent(new d.w.Event('change'));assert.ok(d.doc.querySelector('tr[data-same=true]').hidden);assert.equal(d.doc.querySelector('tr[data-same=false]').hidden,false);d.close();
 const missing=await load('muqayise.html?ids='+[listing.id,third].join(','),null,responses);assert.match(missing.doc.querySelector('#comparison-content').textContent,/Elan əlçatan deyil/);assert.ok(missing.doc.querySelector('#compare-retry'));missing.close();
});
test('gallery supports keyboard, arrows and thumbnail state; missing specs stay unknown',async()=>{
 const d=await load('elan.html?id='+listing.id,null,{['/listings/'+listing.id]:{listing:{...listing,images:[{url:'https://example.test/one.jpg'},{url:'https://example.test/two.jpg'}]}}});
 assert.match(d.doc.querySelector('.vehicle-highlights').textContent,/Qeyd edilməyib/);
 d.doc.querySelector('#gallery-next').click();assert.equal(d.doc.querySelector('#gallery-main').src,'https://example.test/two.jpg');assert.equal(d.doc.querySelector('[data-gallery="1"]').getAttribute('aria-pressed'),'true');
 d.doc.querySelector('.gallery-stage').dispatchEvent(new d.w.KeyboardEvent('keydown',{key:'ArrowRight'}));assert.equal(d.doc.querySelector('#gallery-count').textContent,'1 / 2');d.close();
});

test('credit calculator uses listing price, updates estimates and clears stale results',async()=>{
 const d=await load('elan.html?id='+listing.id,null,{['/listings/'+listing.id]:{listing}}),f=d.doc.querySelector('#credit-form');
 assert.equal(f.elements.price.value,'23000');assert.equal(d.doc.querySelector('#credit-result').hidden,true);
 f.elements.annualRate.value='0';f.elements.months.value='20';f.elements.downPayment.value='3000';f.dispatchEvent(new d.w.Event('input'));
 assert.equal(d.doc.querySelector('#credit-result').hidden,false);assert.match(d.doc.querySelector('.credit-monthly strong').textContent,/1[.\s]?000/);
 f.elements.downPayment.value='24000';f.dispatchEvent(new d.w.Event('input'));assert.equal(d.doc.querySelector('#credit-result').hidden,true);assert.match(d.doc.querySelector('#credit-error').textContent,/İlkin/);
 f.elements.annualRate.value='';f.dispatchEvent(new d.w.Event('submit',{cancelable:true}));assert.match(d.doc.querySelector('#credit-error').textContent,/doldurun/);d.close();
 const service=await load('elan.html?id='+listing.id,null,{['/listings/'+listing.id]:{listing:{...listing,category:'wash'}}});assert.equal(service.doc.querySelector('#credit-form'),null);service.close();
 const standalone=await load('kredit.html');assert.ok(standalone.doc.querySelector('#credit-form'));standalone.close();
});
