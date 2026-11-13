import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Readable} from 'node:stream';
import {readFile} from 'node:fs/promises';
process.env.LOCAL_DATABASE='true';process.env.LOCAL_DB_PATH='memory://';process.env.APP_ORIGIN='http://localhost:4173';process.env.RENTACAR_ENABLED='true';process.env.RENTACAR_ISOLATED_DB='true';delete process.env.DATABASE_URL;delete process.env.VERCEL_ENV;
const {database,query,close}=await import('../server/db.mjs');
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
const bookingInput=(start=2,end=5)=>({car_id:car.id,starts_on:future(start),ends_on:future(end),client_key:randomUUID(),expected_total_cents:rentalQuote(carInput,end-start)});
before(async()=>{const db=await database();await db.exec(await readFile(new URL('../server/schema.sql',import.meta.url),'utf8'));await db.exec(await readFile(new URL('../server/rentacar-schema.sql',import.meta.url),'utf8'));owner=await user('rental_owner');a=await user('renter_a');b=await user('renter_b');admin=await user('rental_admin','admin');insurance=randomUUID();await query("INSERT INTO listings(id,user_id,category,title,description,price,city,phone,status) VALUES($1,$2,'insurance','Legacy insurance','Preserve me',100,'Bakı','+994501234567','active')",[insurance,owner.id]);});after(close);
test('Rent a Car is off by default and always off in production, including explicitly enabled flags',async()=>{
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
 await (await database()).exec(await readFile(new URL('../server/rentacar-schema.sql',import.meta.url),'utf8'));
 assert.equal((await query('SELECT count(*) AS n FROM users')).rows[0].n,users);assert.equal((await query('SELECT count(*) AS n FROM rental_bookings')).rows[0].n,bookings);
 assert.equal((await query('SELECT title,status FROM listings WHERE id=$1',[insurance])).rows[0].title,'Legacy insurance');
});
