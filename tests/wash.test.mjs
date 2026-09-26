import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Readable} from 'node:stream';
import {readFile} from 'node:fs/promises';
process.env.LOCAL_DATABASE='true';process.env.LOCAL_DB_PATH='memory://';process.env.APP_ORIGIN='http://localhost:4173';process.env.WASH_ENABLED='true';delete process.env.DATABASE_URL;
const {database,query,close}=await import('../server/db.mjs');
const {hash}=await import('../server/security.mjs');
const {default:handler}=await import('../api/index.mjs');
const {pointInZone,distanceKm,wazeLinks}=await import('../assets/wash-shared.js');
let owner,a,b,admin,shop,slot;
const prices={exterior:{standard:1000,suv:1500,minutes:20},interior:{standard:500,suv:700,minutes:15}};
async function user(n,role='user'){const id=randomUUID(),token=randomUUID().replaceAll('-','').repeat(2);await query('INSERT INTO users(id,fullname,username,email,password_hash,role) VALUES($1,$2,$2,$3,$4,$5)',[id,n,n+'@example.test','unused',role]);await query("INSERT INTO sessions VALUES($1,$2,now()+interval '1 day')",[hash(token),id]);return {id,cookie:'sosavto_session='+token};}
async function call(path,u,method='GET',data,origin=process.env.APP_ORIGIN){const req=Readable.from(data?[JSON.stringify(data)]:[]);req.url='/api/wash'+path;req.method=method;req.headers={'content-type':'application/json',origin,...(u?{cookie:u.cookie}:{})};let result;const res={statusCode:200,setHeader(){},end(v){result=JSON.parse(v);}};await handler(req,res);return {code:res.statusCode,...result};}
const post=(p,u,d)=>call(p,u,'POST',d);
async function newSlot(cap=1,offset=2){const r=await post('/shops/'+shop+'/slots',owner,{starts_at:new Date(Date.now()+offset*3600000).toISOString(),ends_at:new Date(Date.now()+(offset+1)*3600000).toISOString(),capacity:cap});assert.equal(r.code,200,JSON.stringify(r));return r.slot.id;}
const input=(s=slot)=>({slot_id:s,client_key:randomUUID(),phone:'+994501234567',size:'standard',services:['exterior','interior'],method:'cash',expected_total_cents:1500});
before(async()=>{const db=await database();await db.exec(await readFile(new URL('../server/schema.sql',import.meta.url),'utf8'));await db.exec(await readFile(new URL('../server/wash-schema.sql',import.meta.url),'utf8'));owner=await user('owner');a=await user('customer_a');b=await user('customer_b');admin=await user('admin','admin');shop=randomUUID();await query("INSERT INTO listings(id,user_id,category,title,description,price,city,phone,address,latitude,longitude,status) VALUES($1,$2,'wash','Test avtoyuma','Test',10,'Bakı','+994501234567','Test küçəsi',40.4,49.8,'active')",[shop,owner.id]);});after(close);
test('feature gate, authentication, CSRF and ownership enforced',async()=>{process.env.WASH_ENABLED='false';assert.equal((await call('/shops')).code,404);process.env.WASH_ENABLED='true';assert.equal((await call('/owner')).code,401);assert.equal((await call('/shops/'+shop,a,'PUT',{services:prices,cash_enabled:true})).code,404);assert.equal((await call('/shops/'+shop,owner,'PUT',{services:prices,cash_enabled:true},'https://evil.test')).code,403);assert.equal((await call('/shops/'+shop,owner,'PUT',{services:prices,cash_enabled:true})).code,200);});
test('owner publishes slots, overlapping windows and unauthorized edits fail',async()=>{slot=await newSlot();assert.equal((await post('/shops/'+shop+'/slots',owner,{starts_at:new Date(Date.now()+2.1*3600000).toISOString(),ends_at:new Date(Date.now()+2.5*3600000).toISOString(),capacity:1})).code,409);assert.equal((await call('/slots/'+slot,a,'PATCH',{capacity:10,blocked:0,closed:false})).code,404);});
test('server prices, services, duration and unavailable card gate',async()=>{for(const x of [{expected_total_cents:1},{services:['exterior','exterior']},{services:['evil']},{size:'truck'},{method:'card'}])assert.ok((await post('/hold',a,{...input(),...x})).code>=400);assert.equal((await call('/shops/'+shop+'/slots')).slots[0].available,1);});
let reservation;
test('concurrent last-place race admits exactly one hold; retries are idempotent',async()=>{const first=input(),second=input();const results=await Promise.all([post('/hold',a,first),post('/hold',b,second)]);assert.deepEqual(results.map(r=>r.code).sort(),[200,409],JSON.stringify(results));if(results[1].code===200)[a,b]=[b,a];const winner=results.find(r=>r.code===200);reservation=winner.booking;const request=results[0].code===200?first:second;assert.equal((await post('/hold',a,request)).booking.id,reservation.id);assert.equal((await post('/hold',a,{...request,phone:'+994509999999'})).code,409);assert.equal((await call('/shops/'+shop+'/slots')).slots[0].available,0);});
test('selection snapshot survives changed prices; strangers cannot confirm or cancel',async()=>{assert.equal((await post('/bookings/'+reservation.id+'/confirm',b,{})).code,404);assert.equal((await post('/bookings/'+reservation.id+'/confirm',owner,{})).code,403);assert.equal((await call('/shops/'+shop,owner,'PUT',{services:{...prices,exterior:{...prices.exterior,standard:2000}},cash_enabled:true})).code,200);const r=await post('/bookings/'+reservation.id+'/confirm',a,{});assert.equal(r.booking.total_cents,1500);assert.equal(r.booking.snapshot.items[0].cents,1000);assert.equal(r.booking.payment_status,'unpaid');assert.equal((await post('/bookings/'+reservation.id+'/confirm',a,{})).code,200);});
test('capacity cannot drop below bookings; cancellation returns capacity',async()=>{assert.equal((await call('/slots/'+slot,owner,'PATCH',{capacity:1,blocked:1,closed:false})).code,409);assert.equal((await post('/bookings/'+reservation.id+'/cancel',b,{})).code,404);assert.equal((await post('/bookings/'+reservation.id+'/cancel',a,{})).booking.status,'cancelled');assert.equal((await call('/shops/'+shop+'/slots')).slots[0].available,1);});
test('expired holds release places without cron and cannot confirm',async()=>{const r=await post('/hold',a,{...input(),expected_total_cents:2500});assert.equal(r.code,200);await query("UPDATE wash_bookings SET expires_at=now()-interval '1 second' WHERE id=$1",[r.booking.id]);assert.equal((await call('/shops/'+shop+'/slots')).slots[0].available,1);assert.equal((await post('/bookings/'+r.booking.id+'/confirm',a,{})).code,409);});
test('closed slots and non-active listings block new holds',async()=>{await call('/slots/'+slot,owner,'PATCH',{capacity:1,blocked:0,closed:true});assert.equal((await post('/hold',a,{...input(),expected_total_cents:2500})).code,409);await call('/slots/'+slot,owner,'PATCH',{capacity:1,blocked:0,closed:false});await query("UPDATE listings SET status='pending' WHERE id=$1",[shop]);assert.equal((await post('/hold',a,{...input(),expected_total_cents:2500})).code,409);assert.equal((await call('/shops')).shops.length,0);await query("UPDATE listings SET status='active' WHERE id=$1",[shop]);});
test('completion and rating require real participation, received cash is not inferred',async()=>{const r=await post('/hold',a,{...input(),expected_total_cents:2500});assert.equal(r.code,200);const id=r.booking.id;await post('/bookings/'+id+'/confirm',a,{});assert.equal((await post('/bookings/'+id+'/review',a,{rating:5})).code,403);await query("UPDATE wash_slots SET starts_at=now()-interval '1 minute',ends_at=now()+interval '1 hour' WHERE id=$1",[slot]);assert.equal((await post('/bookings/'+id+'/arrive',a,{})).code,403);assert.equal((await post('/bookings/'+id+'/arrive',owner,{})).booking.status,'arrived');assert.equal((await post('/bookings/'+id+'/complete',owner,{})).code,409);assert.equal((await post('/bookings/'+id+'/complete',a,{})).booking.payment_status,'unpaid');assert.equal((await post('/bookings/'+id+'/review',a,{rating:5,comment:'Yaxşı'})).code,200);assert.equal((await post('/bookings/'+id+'/review',b,{rating:1})).code,404);assert.equal((await call('/shops')).shops[0].rating,5);});
test('zone upload requires admin; geographic math and navigation links',async()=>{const ring=[[49,40],[50,40],[50,41],[49,41],[49,40]];assert.equal((await post('/zones',a,{name:'Test',ring})).code,403);assert.equal((await post('/zones',admin,{name:'Test',ring})).code,200);assert.equal(pointInZone(40.5,49.5,ring),true);assert.equal(pointInZone(42,49.5,ring),false);assert.equal(distanceKm([40,49],[40,49]),0);assert.ok(wazeLinks(40.4,49.8).web.startsWith('https://www.waze.com/ul?'));});

async function listingCall(id,u,method='GET',data){
 const req=Readable.from(data?[JSON.stringify(data)]:[]);req.url='/api/'+id;req.method=method;req.headers={'content-type':'application/json',origin:process.env.APP_ORIGIN,cookie:u.cookie};let result;const res={statusCode:200,setHeader(){},end(v){result=JSON.parse(v);}};await handler(req,res);return {code:res.statusCode,...result};
}
const edited={category:'wash',title:'Yenilənmiş avtoyuma',description:'Avtoyuma xidmətinin yenilənmiş ətraflı təsviri.',price:15,city:'Bakı',phone:'+994501234567',details:{},imageIds:[]};
test('wash listing edit and status work; deletion retains past bookings and cannot be restored',async()=>{
 assert.equal((await listingCall('listings/'+shop,owner,'PUT',edited)).code,200);
 assert.equal((await listingCall('listings/'+shop,owner)).listing.title,edited.title);
 assert.equal((await listingCall('listings/'+shop,owner,'PATCH',{status:'sold'})).code,200);
 assert.equal((await listingCall('listings/'+shop,owner,'PATCH',{status:'pending'})).code,200);
 assert.equal((await listingCall('listings/'+shop,owner,'PUT',{...edited,category:'service'})).code,409);
 const before=(await call('/bookings',a)).bookings.length;
 assert.equal((await listingCall('listings/'+shop,b,'DELETE')).code,403);
 assert.equal((await listingCall('listings/'+shop,owner,'DELETE')).code,200);
 assert.equal((await listingCall('my-listings',owner)).listings.length,0);
 assert.equal((await call('/owner',owner)).shops.length,0);
 assert.equal((await call('/shops')).shops.length,0);
 assert.equal((await call('/bookings',a)).bookings.length,before);
 for(const method of ['GET','PATCH','PUT','DELETE'])assert.equal((await listingCall('listings/'+shop,owner,method,method==='GET'?undefined:edited)).code,404);
 assert.equal((await call('/shops/'+shop,owner,'PUT',{services:prices,cash_enabled:true})).code,404);
});
test('linked wash with empty slots deletes cleanly; active reservations prevent destructive actions',async()=>{
 shop=randomUUID();await query("INSERT INTO listings(id,user_id,category,title,description,price,city,phone,status) VALUES($1,$2,'wash','Test yuma','Test',10,'Bakı','+994501234567','active')",[shop,owner.id]);
 await call('/shops/'+shop,owner,'PUT',{services:prices,cash_enabled:true});slot=await newSlot(1,5);
 const held=await post('/hold',a,input());assert.equal(held.code,200,JSON.stringify(held));
 for(const [method,data] of [['DELETE',{}],['PATCH',{status:'sold'}],['PUT',edited]]){
  const r=await listingCall('listings/'+shop,owner,method,data);assert.equal(r.code,409);assert.match(r.error,/aktiv rezerv/);
 }
 assert.equal((await listingCall('listings/'+shop,owner)).listing.status,'active');
 await post('/bookings/'+held.booking.id+'/cancel',a,{});
 assert.equal((await listingCall('listings/'+shop,owner,'DELETE')).code,200);
 shop=randomUUID();await query("INSERT INTO listings(id,user_id,category,title,description,price,city,phone,status) VALUES($1,$2,'wash','Empty yuma','Test',10,'Bakı','+994501234567','active')",[shop,owner.id]);
 await call('/shops/'+shop,owner,'PUT',{services:prices,cash_enabled:true});await newSlot(1,6);
 assert.equal((await listingCall('listings/'+shop,owner,'DELETE')).code,200);
 assert.equal((await query('SELECT id FROM listings WHERE id=$1',[shop])).rows.length,0);
 assert.equal((await query('SELECT id FROM wash_shops WHERE id=$1',[shop])).rows.length,0);
 assert.equal((await query('SELECT id FROM wash_slots WHERE shop_id=$1',[shop])).rows.length,0);
});
