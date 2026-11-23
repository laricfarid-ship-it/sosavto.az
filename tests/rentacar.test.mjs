import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Readable} from 'node:stream';
import {readFile} from 'node:fs/promises';
process.env.LOCAL_DATABASE='true';process.env.LOCAL_DB_PATH='memory://';process.env.APP_ORIGIN='http://localhost:4173';process.env.RENTACAR_ENABLED='true';process.env.RENTACAR_ISOLATED_DB='true';delete process.env.DATABASE_URL;delete process.env.VERCEL_ENV;delete process.env.RENTACAR_PRODUCTION_APPROVED;
const {database,query,transaction,close}=await import('../server/db.mjs');
const {hash}=await import('../server/security.mjs');
const {rentalDates,rentalQuote}=await import('../server/rentacar.mjs');
const {rentalToday}=await import('../assets/rentacar-shared.js');
const {default:handler}=await import('../api/index.mjs');
let owner,a,b,admin,car,insurance;
const future=n=>new Date(Date.parse(rentalToday())+n*86400000).toISOString().slice(0,10);
async function user(n,role='user'){const id=randomUUID(),token=randomUUID().replaceAll('-','').repeat(2);await query('INSERT INTO users(id,fullname,username,email,password_hash,role) VALUES($1,$2,$2,$3,$4,$5)',[id,n,n+'@example.test','unused',role]);await query("INSERT INTO sessions VALUES($1,$2,now()+interval '1 day')",[hash(token),id]);return {id,cookie:'sosavto_session='+token};}
async function call(path,u,method='GET',data,origin=process.env.APP_ORIGIN){const req=Readable.from(data?[JSON.stringify(data)]:[]);req.url='/api/rentacar'+path;req.method=method;req.headers={'content-type':'application/json',origin,...(u?{cookie:u.cookie}:{})};let result;const res={statusCode:200,setHeader(){},end(v){result=JSON.parse(v);}};await handler(req,res);return {code:res.statusCode,...result};}
const post=(p,u,d)=>call(p,u,'POST',d),patch=(p,u,d)=>call(p,u,'PATCH',d);
const carInput={title:'Premium test car',city:'Bakı',vehicle_type:'premium',year:2023,images:['https://example.test/car.jpg'],daily_cents:10000,weekly_cents:60000,monthly_cents:200000,deposit_cents:50000,terms:'Minimum yaş 25, təcrübə 3 il, 200 km/gün; təhvil Bakı, ləğv 48 saat əvvəl.'};
const bookingInput=(start=2,end=5)=>({car_id:car.id,starts_on:future(start),ends_on:future(end),client_key:randomUUID(),phone:'+994501234567',expected_total_cents:rentalQuote(carInput,end-start)});
before(async()=>{const db=await database();await db.exec(await readFile(new URL('../server/schema.sql',import.meta.url),'utf8'));await db.exec(await readFile(new URL('../server/rentacar-schema.sql',import.meta.url),'utf8'));owner=await user('rental_owner');a=await user('renter_a');b=await user('renter_b');admin=await user('rental_admin','admin');insurance=randomUUID();await query("INSERT INTO listings(id,user_id,category,title,description,price,city,phone,status) VALUES($1,$2,'insurance','Legacy insurance','Preserve me',100,'Bakı','+994501234567','active')",[insurance,owner.id]);});after(close);
test('Rent a Car is off by default and production requires a separate approval flag',async()=>{
 delete process.env.RENTACAR_ENABLED;assert.equal((await call('/config')).enabled,false);assert.equal((await call('/cars')).code,503);
 process.env.RENTACAR_ENABLED='true';delete process.env.RENTACAR_ISOLATED_DB;assert.equal((await call('/config')).enabled,false);process.env.RENTACAR_ISOLATED_DB='true';
 process.env.VERCEL_ENV='production';assert.equal((await call('/config')).enabled,false);assert.equal((await post('/profile',owner,{})).code,503);delete process.env.VERCEL_ENV;
});
test('profile creation enforces login, CSRF and moderation; company is not public until approved',async()=>{
 assert.equal((await post('/profile',null,{})).code,401);assert.equal((await call('/profile',owner,'POST',{},'https://evil.test')).code,403);
 const r=await post('/profile',owner,{kind:'company',name:'Premium Test Rental',city:'Bakı',phone:'+994501234567',status:'approved'});assert.equal(r.code,200,JSON.stringify(r));assert.equal(r.profile.status,'pending');
 assert.equal((await post('/cars',owner,carInput)).code,403);assert.equal((await call('/profiles/'+owner.id)).code,404);
 assert.equal((await patch('/admin/profiles/'+owner.id,a,{status:'approved',note:'Yoxlama tamamlandı.'})).code,403);
 assert.equal((await patch('/admin/profiles/'+owner.id,admin,{status:'approved',note:''})).code,400);
 assert.equal((await patch('/admin/profiles/'+owner.id,admin,{status:'approved',note:'İcarə səlahiyyəti testdə yoxlanıldı.'})).code,200);
 assert.equal((await call('/profiles/'+owner.id)).profile.name,'Premium Test Rental');
});
test('individual owner verification stays private and cannot self-approve',async()=>{
 const r=await post('/profile',b,{kind:'individual',name:'Individual Owner',city:'Bakı',phone:'+994509876543'});assert.equal(r.profile.status,'pending');
 assert.equal((await patch('/admin/profiles/'+b.id,admin,{status:'approved',note:'Sahiblik və icarə səlahiyyəti yoxlanıldı.'})).code,200);
 assert.equal((await call('/profiles/'+b.id)).code,404);
 assert.equal((await post('/profile',b,{kind:'company',name:'Override',city:'Bakı',phone:'+994509876543'})).code,409);
});
test('car inputs validate prices, image URLs and rental terms; pending cars stay hidden',async()=>{
 for(const input of [{daily_cents:-1},{weekly_cents:1.2},{images:['javascript:alert(1)']},{images:['https://user:pass@example.test/a.jpg']},{images:[]},{terms:'x'},{year:1800}])assert.equal((await post('/cars',owner,{...carInput,...input})).code,400,JSON.stringify(input));
 const r=await post('/cars',owner,{...carInput,status:'active'});assert.equal(r.code,200,JSON.stringify(r));car=r.car;assert.equal(car.status,'pending');assert.ok(car.listing_number);assert.equal(r.url,'/rentacar.html?car='+car.id);assert.equal((await call('/cars')).cars.length,0);
 assert.equal((await patch('/admin/cars/'+car.id,admin,{status:'active'})).code,200);assert.equal((await call('/cars/'+car.id)).car.title,car.title);
});
test('real date validation and package pricing are exact, including leap years',()=>{
 assert.equal(rentalDates('2028-02-28','2028-03-01','2028-01-01'),2);
 for(const [s,e]of [['2028-02-30','2028-03-02'],['2028-01-02','2028-01-02'],['2028-01-03','2028-01-02'],['2027-12-31','2028-01-02'],['2028-01-01','2029-01-02']])assert.throws(()=>rentalDates(s,e,'2028-01-01'));
 assert.equal(rentalQuote(carInput,7),60000);assert.equal(rentalQuote(carInput,8),70000);assert.equal(rentalQuote(carInput,30),200000);assert.equal(rentalQuote(carInput,37),260000);
});
let first,second;
test('server owns price and terms snapshot; owner cannot rent own car; retries are idempotent',async()=>{
 assert.equal((await post('/bookings',owner,bookingInput())).code,403);assert.equal((await post('/bookings',a,{...bookingInput(),expected_total_cents:1})).code,409);
 const input=bookingInput();const r=await post('/bookings',a,input);assert.equal(r.code,200,JSON.stringify(r));first=r.booking;
 assert.equal(first.status,'pending');assert.equal(first.total_cents,30000);assert.equal(first.snapshot.terms,carInput.terms);assert.equal((await post('/bookings',a,input)).booking.id,first.id);
 assert.equal((await post('/bookings',a,{...input,ends_on:future(6)})).code,409);
 const other=await post('/bookings',b,bookingInput());assert.equal(other.code,200);second=other.booking;
});
test('simultaneous overlapping confirmations have exactly one winner; renters and strangers cannot confirm',async()=>{
 assert.equal((await post('/bookings/'+first.id+'/confirm',a,{})).code,403);
 const other=await user('stranger');assert.equal((await post('/bookings/'+first.id+'/confirm',other,{})).code,404);
 const r=await Promise.all([post('/bookings/'+first.id+'/confirm',owner,{}),post('/bookings/'+second.id+'/confirm',owner,{})]);assert.deepEqual(r.map(x=>x.code).sort(),[200,409],JSON.stringify(r));
 if(r[1].code===200){[first,second]=[second,first];[a,b]=[b,a];}
 assert.equal((await query("SELECT count(*)::integer AS n FROM rental_bookings WHERE status='confirmed'")).rows[0].n,1);
 assert.equal((await post('/bookings/'+first.id+'/confirm',owner,{})).code,200);
 assert.equal((await post('/bookings',b,bookingInput())).code,409);
});
test('availability search excludes overlaps and accepts exact return-day handover; city/type filters work',async()=>{
 assert.equal((await call('/cars?start='+future(3)+'&end='+future(4))).cars.length,0);
 assert.equal((await call('/cars?start='+future(5)+'&end='+future(6))).cars.length,1);
 assert.equal((await call('/cars?city=Gəncə')).cars.length,0);assert.equal((await call('/cars?vehicle_type=sedan')).cars.length,0);
 assert.equal((await call('/cars?start=2028-02-30&end=2028-03-03')).code,400);
});
test('cancellation releases dates, closed state cannot be resurrected and premature completion fails',async()=>{
 assert.equal((await post('/bookings/'+first.id+'/complete',owner,{})).code,409);
 assert.equal((await post('/bookings/'+first.id+'/cancel',b,{})).code,404);
 assert.equal((await post('/bookings/'+first.id+'/cancel',a,{})).booking.status,'cancelled');
 assert.equal((await post('/bookings/'+first.id+'/confirm',owner,{})).code,409);
 assert.equal((await post('/bookings/'+second.id+'/confirm',owner,{})).code,200);
});
test('admin and owner dashboards are scoped and actions are auditable',async()=>{
 assert.equal((await call('/admin',a)).code,403);assert.equal((await call('/owner',owner)).cars.length,1);assert.equal((await call('/owner',a)).cars.length,0);
 assert.equal((await call('/bookings',a)).bookings.every(x=>x.renter_id===a.id),true);
 const r=await call('/admin',admin);assert.equal(r.cars.length,1);assert.ok(r.audit.some(x=>x.action==='booking.confirm'));assert.ok(r.audit.some(x=>x.action==='moderation.profiles'));
});
test('additive migration reruns preserve insurance, user accounts and rental bookings',async()=>{
 const users=(await query('SELECT count(*) AS n FROM users')).rows[0].n,bookings=(await query('SELECT count(*) AS n FROM rental_bookings')).rows[0].n;
 const sql=await readFile(new URL('../server/rentacar-schema.sql',import.meta.url),'utf8');await transaction(async c=>{for(const statement of sql.split(';').map(s=>s.trim()).filter(Boolean))await c.query(statement);});
 assert.equal((await query('SELECT count(*) AS n FROM users')).rows[0].n,users);assert.equal((await query('SELECT count(*) AS n FROM rental_bookings')).rows[0].n,bookings);
 assert.equal((await query('SELECT title,status FROM listings WHERE id=$1',[insurance])).rows[0].title,'Legacy insurance');
});

test('production requires separate explicit approval; isolated preview flag alone cannot activate live rentals',async()=>{
 process.env.VERCEL_ENV='production';assert.equal((await call('/config')).enabled,false);process.env.RENTACAR_PRODUCTION_APPROVED='true';assert.equal((await call('/config')).enabled,true);delete process.env.RENTACAR_PRODUCTION_APPROVED;delete process.env.VERCEL_ENV;
});
test('owner edits return to moderation, strangers cannot edit, active confirmed bookings prevent destructive changes',async()=>{
 assert.equal((await call('/cars/'+car.id,a,'PUT',carInput)).code,404);
 assert.equal((await call('/cars/'+car.id,owner,'PUT',carInput)).code,409);
 assert.equal((await call('/cars/'+car.id,owner,'PATCH',{status:'archived'})).code,409);
 const other=await post('/cars',owner,{...carInput,title:'Editable rental'});assert.equal(other.code,200);
 const id=other.car.id;await patch('/admin/cars/'+id,admin,{status:'active'});
 const edit=await call('/cars/'+id,owner,'PUT',{...carInput,title:'Updated rental',daily_cents:12000});assert.equal(edit.car.status,'pending');assert.equal(edit.car.title,'Updated rental');assert.equal(edit.car.listing_number,other.car.listing_number);
 assert.equal((await call('/cars/'+id,owner,'PATCH',{status:'archived'})).code,200);
});
test('calendar reveals confirmed intervals only and notifications persist for participants',async()=>{
 const r=await call('/cars/'+car.id+'/calendar');assert.equal(r.code,200);assert.equal(r.intervals.length,1);assert.equal(Object.hasOwn(r.intervals[0],'renter_id'),false);
 const notifications=(await query('SELECT body FROM notifications WHERE user_id=$1',[owner.id])).rows;assert.ok(notifications.some(n=>n.body.includes('Rent a Car')));
 assert.equal((await call('/cars?owner_id='+owner.id)).cars.every(c=>c.owner_id===owner.id),true);
});
test('rental uploads validate the image and attach only media owned by the listing owner',async()=>{
 const sharp=(await import('sharp')).default;const image=await sharp({create:{width:100,height:100,channels:3,background:'#224466'}}).png().toBuffer();
 assert.equal((await post('/uploads',a,{data:'data:image/png;base64,'+image.toString('base64')})).code,403);
 const r=await post('/uploads',owner,{data:'data:image/png;base64,'+image.toString('base64')});assert.equal(r.code,200,JSON.stringify(r));assert.match(r.url,/^\/media\//);
 const created=await post('/cars',owner,{...carInput,images:[r.url],media_ids:[r.id]});assert.equal(created.code,200,JSON.stringify(created));assert.equal((await query('SELECT car_id FROM rental_media WHERE id=$1',[r.id])).rows[0].car_id,created.car.id);
 assert.equal((await post('/cars',b,{...carInput,images:[r.url],media_ids:[r.id]})).code,403);
 assert.equal((await post('/uploads',owner,{data:'data:image/png;base64,bm90YW5pbWFnZQ=='})).code,400);
});
test('profile editing requires renewed verification and keeps old bookings and cars',async()=>{
 const count=(await query('SELECT count(*) AS n FROM rental_bookings')).rows[0].n;
 const r=await call('/profile',owner,'PATCH',{name:'Updated company',city:'Bakı',phone:'+994501234567'});assert.equal(r.profile.status,'pending');assert.equal((await call('/cars?owner_id='+owner.id)).cars.length,0);assert.equal((await query('SELECT count(*) AS n FROM rental_bookings')).rows[0].n,count);
});

test('admin creates profiles for existing accounts and manages cars on their behalf without granting owner impersonation',async()=>{
 const target=await user('managed_owner');
 const data={account:'managed_owner',kind:'company',name:'Managed Rental',city:'Bakı',phone:'+994501234567'};
 assert.equal((await post('/admin/profiles',a,data)).code,403);
 const p=await post('/admin/profiles',admin,data);assert.equal(p.profile.user_id,target.id);assert.equal(p.profile.status,'pending');
 assert.equal((await post('/admin/profiles',admin,data)).code,409);
 assert.equal((await post('/cars?owner_id='+target.id,admin,carInput)).code,403);
 await patch('/admin/profiles/'+target.id,admin,{status:'approved',note:'Sahibin icarə səlahiyyəti yoxlanıldı.'});
 assert.equal((await call('/owner?owner_id='+target.id,a)).code,403);
 assert.equal((await post('/cars?owner_id='+target.id,a,carInput)).code,403);
 const r=await post('/cars?owner_id='+target.id,admin,carInput);assert.equal(r.car.owner_id,target.id);
 assert.equal((await call('/cars/'+r.car.id,admin,'PUT',{...carInput,title:'Admin edited'})).car.title,'Admin edited');
 assert.equal((await call('/owner?owner_id='+target.id,admin)).cars[0].owner_id,target.id);
 const audits=(await call('/admin',admin)).audit;assert.ok(audits.some(x=>x.action==='profile.create-on-behalf'&&x.actor_id===admin.id));
});
test('company directory excludes individuals and pending profiles; 61-car fleet paginates completely',async()=>{
 await patch('/admin/profiles/'+owner.id,admin,{status:'approved',note:'Sahibin icarə səlahiyyəti yenidən yoxlanıldı.'});
 await transaction(async c=>{for(let i=0;i<60;i++)await c.query("INSERT INTO rental_cars(id,owner_id,title,city,vehicle_type,year,images,daily_cents,weekly_cents,monthly_cents,deposit_cents,terms,status) VALUES($1,$2,$3,'Bakı','sedan',2023,'[]',10000,60000,200000,0,'Pagination fixture','active')",[randomUUID(),owner.id,'Fleet '+i]);});
 const company=(await call('/companies')).companies.find(p=>p.user_id===owner.id);assert.equal(company.car_count,61);assert.equal(Object.hasOwn(company,'review_note'),false);
 assert.equal((await call('/companies')).companies.some(x=>x.user_id===b.id),false);
 const ids=[];for(let page=1;page<=3;page++){const r=await call('/profiles/'+owner.id+'?page='+page);assert.equal(r.total,61);ids.push(...r.cars.map(x=>x.id));assert.ok(r.cars.every(x=>x.owner_kind==='company'&&x.owner_id===owner.id));}
 assert.equal(new Set(ids).size,61);assert.equal((await call('/cars?owner_id='+owner.id+'&page=3')).cars.length,13);
 assert.equal((await call('/cars?page=-1')).code,400);assert.equal((await call('/companies?page=1.5')).code,400);
});
test('commission is server-owned, rounded in cents, excludes deposit and remains fixed after settings change',async()=>{
 assert.equal((await patch('/admin/finance/settings',owner,{commission_bps:1000})).code,403);
 for(const n of [-1,10001,1.5])assert.equal((await patch('/admin/finance/settings',admin,{commission_bps:n})).code,400);
 await patch('/admin/finance/settings',admin,{commission_bps:1250});
 const input=bookingInput(20,23),r=await post('/bookings',a,{...input,commission_cents:1,commission_bps:0});assert.equal(r.code,200);assert.equal(r.booking.commission_cents,3750);assert.equal(r.booking.commission_configured,true);
 await patch('/admin/finance/settings',admin,{commission_bps:2000});
 assert.equal((await post('/bookings',a,input)).booking.commission_cents,3750);
 assert.equal((await call('/finance',b)).entries.some(x=>x.id===r.booking.id),false);
 const entry=(await call('/finance',owner)).entries.find(x=>x.id===r.booking.id);assert.equal(entry.commission_bps,1250);assert.equal((await call('/finance',owner)).online_payments,false);
 assert.equal((await post('/admin/finance/'+r.booking.id+'/receive',owner,{reference:'bank-1'})).code,403);
 assert.equal((await post('/admin/finance/'+r.booking.id+'/receive',admin,{reference:'bank-1'})).code,409);
 await post('/bookings/'+r.booking.id+'/confirm',owner,{});
 // Advance only fixture dates, then exercise real complete/receipt transitions.
 await query("UPDATE rental_bookings SET starts_on=CURRENT_DATE-3,ends_on=CURRENT_DATE-1 WHERE id=$1",[r.booking.id]);
 assert.equal((await post('/bookings/'+r.booking.id+'/complete',owner,{})).code,200);
 const receipts=await Promise.all([post('/admin/finance/'+r.booking.id+'/receive',admin,{reference:'bank-1'}),post('/admin/finance/'+r.booking.id+'/receive',admin,{reference:'bank-1'})]);assert.ok(receipts.every(x=>x.code===200));assert.equal(receipts[0].receipt.id,receipts[1].receipt.id);assert.equal(receipts[0].receipt.amount_cents,3750);
 assert.equal((await post('/admin/finance/'+r.booking.id+'/receive',admin,{reference:'bank-2'})).code,409);
 assert.equal((await query('SELECT count(*)::integer AS n FROM rental_commission_receipts')).rows[0].n,1);
 const cancelled=await post('/bookings',a,bookingInput(25,26));await post('/bookings/'+cancelled.booking.id+'/cancel',a,{});assert.equal((await post('/admin/finance/'+cancelled.booking.id+'/receive',admin,{reference:'bank-3'})).code,409);
});

test('rental uploads accept genuine phone photos above 64 KB and migration reruns retain financial receipts',async()=>{
 const sharp=(await import('sharp')).default,{randomBytes}=await import('node:crypto');const bytes=await sharp(randomBytes(512*512*3),{raw:{width:512,height:512,channels:3}}).jpeg().toBuffer();assert.ok(bytes.length>65536);
 const r=await post('/uploads',owner,{data:'data:image/jpeg;base64,'+bytes.toString('base64')});assert.equal(r.code,200,JSON.stringify(r));
 const sql=await readFile(new URL('../server/rentacar-schema.sql',import.meta.url),'utf8');await transaction(async c=>{for(const statement of sql.split(';').map(s=>s.trim()).filter(Boolean))await c.query(statement);});
 assert.equal((await query('SELECT count(*)::integer AS n FROM rental_commission_receipts')).rows[0].n,1);assert.equal((await query('SELECT commission_bps FROM rental_finance_settings WHERE id=1')).rows[0].commission_bps,2000);
});
