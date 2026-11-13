import {quoteRental,rentalToday} from '../assets/rentacar-shared.js';
import {randomUUID} from 'node:crypto';
import {query,transaction} from './db.mjs';
import {body,fail,requireUser,requireAdmin,text,uuid} from './security.mjs';
export const rentalEnabled=()=>process.env.VERCEL_ENV!=='production'&&process.env.RENTACAR_ENABLED==='true'&&process.env.RENTACAR_ISOLATED_DB==='true';
const day=rentalToday;
const isoDay=v=>v instanceof Date?v.toISOString().slice(0,10):String(v).slice(0,10);
function date(v){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)fail(400,'Tarixi düzgün seçin.');return v;}
export function rentalDates(start,end,today=day()){
 date(start);date(end);const days=(Date.parse(end)-Date.parse(start))/86400000;
 if(start<today||days<1||days>365)fail(400,'İcarə müddəti 1–365 gün olmalıdır; keçmiş tarix seçilə bilməz.');return days;
}
export function rentalQuote(car,days){try{return quoteRental(car,days);}catch(e){fail(400,e.message);}}

const cents=(v,zero=false)=>{if(!Number.isInteger(v)||v<(zero?0:1)||v>100000000)fail(400,'Qiyməti qəpiklə və tam ədəd olaraq daxil edin.');return v;};
function carInput(b){
 if(!['economy','sedan','suv','premium'].includes(b.vehicle_type))fail(400,'Avtomobil növünü seçin.');
 if(!Number.isInteger(b.year)||b.year<1900||b.year>new Date().getFullYear()+1)fail(400,'Buraxılış ili düzgün deyil.');
 if(!Array.isArray(b.images)||b.images.length<1||b.images.length>12)fail(400,'1–12 şəkil seçin.');
 const images=b.images.map(v=>{if(typeof v!=='string'||v.length>1200)fail(400,'Şəkil ünvanı düzgün deyil.');let u;try{u=new URL(v);}catch{fail(400,'HTTPS şəkil ünvanı tələb olunur.');}if(u.protocol!=='https:'||u.username||u.password)fail(400,'HTTPS şəkil ünvanı tələb olunur.');return u.href;});
 return {title:text(b.title,'Başlıq',3,120),city:text(b.city,'Şəhər',2,80),vehicle_type:b.vehicle_type,year:b.year,images,daily_cents:cents(b.daily_cents),weekly_cents:cents(b.weekly_cents),monthly_cents:cents(b.monthly_cents),deposit_cents:cents(b.deposit_cents,true),terms:text(b.terms,'İcarə şərtləri',20,3000)};
}
const publicCar=`c.*,p.name AS owner_name,p.kind AS owner_kind,p.phone AS owner_phone`;
const audit=(c,user,action,id,detail={})=>c.query('INSERT INTO rental_audit(id,actor_id,action,subject_id,detail) VALUES($1,$2,$3,$4,$5)',[randomUUID(),user.id,action,id,JSON.stringify(detail)]);
export async function rentacar(req,user,path,method,url){
 if(!rentalEnabled())fail(503,'Rent a Car hazırda dizayn önizləməsidir. Real rezervasiya aktiv deyil.');
 const root='/api/rentacar';
 if(path===root+'/cars'&&method==='GET'){
  const p=url.searchParams,args=[],where=["c.status='active'","p.status='approved'"];
  for(const key of ['city','vehicle_type'])if(p.get(key)){args.push(text(p.get(key),key,1,80));where.push(`c.${key}=$${args.length}`);}
  if(p.has('start')||p.has('end')){rentalDates(p.get('start'),p.get('end'));args.push(p.get('start'),p.get('end'));where.push(`NOT EXISTS(SELECT 1 FROM rental_bookings b WHERE b.car_id=c.id AND b.status='confirmed' AND b.starts_on<$${args.length}::date AND b.ends_on>$${args.length-1}::date)`);}
  return {cars:(await query(`SELECT ${publicCar} FROM rental_cars c JOIN rental_profiles p ON p.user_id=c.owner_id WHERE ${where.join(' AND ')} ORDER BY c.created_at DESC LIMIT 100`,args)).rows};
 }
 const detail=path.match(/^\/api\/rentacar\/cars\/([a-f0-9-]+)$/);
 if(detail&&method==='GET'){
  const car=(await query(`SELECT ${publicCar} FROM rental_cars c JOIN rental_profiles p ON p.user_id=c.owner_id WHERE c.id=$1 AND c.status='active' AND p.status='approved'`,[uuid(detail[1])])).rows[0];if(!car)fail(404,'İcarə elanı tapılmadı.');return {car,url:'/rentacar.html?car='+car.id};
 }
 const profile=path.match(/^\/api\/rentacar\/profiles\/([a-f0-9-]+)$/);
 if(profile&&method==='GET'){
  const p=(await query("SELECT user_id,name,kind,city,phone FROM rental_profiles WHERE user_id=$1 AND status='approved' AND kind='company'",[uuid(profile[1])])).rows[0];if(!p)fail(404,'Şirkət tapılmadı.');return {profile:p,cars:(await query("SELECT * FROM rental_cars WHERE owner_id=$1 AND status='active' ORDER BY created_at DESC",[p.user_id])).rows};
 }
 requireUser(user);
 if(path===root+'/profile'&&method==='POST'){
  const b=await body(req);if(!['company','individual'].includes(b.kind))fail(400,'Sahib tipini seçin.');
  const phone=text(b.phone,'Telefon',9,25);if(!/^\+?[0-9 ()-]+$/.test(phone))fail(400,'Telefon düzgün deyil.');
  const values=[user.id,b.kind,text(b.name,'Ad',2,120),text(b.city,'Şəhər',2,80),phone];
  const p=await transaction(async c=>{const r=await c.query(`INSERT INTO rental_profiles(user_id,kind,name,city,phone) VALUES($1,$2,$3,$4,$5) ON CONFLICT(user_id) DO NOTHING RETURNING *`,values);if(!r.rows.length)fail(409,'İcarə profiliniz artıq mövcuddur.');await audit(c,user,'profile.create',user.id);return r.rows[0];});return {profile:p};
 }
 if(path===root+'/owner'&&method==='GET')return {profile:(await query('SELECT * FROM rental_profiles WHERE user_id=$1',[user.id])).rows[0]||null,cars:(await query('SELECT * FROM rental_cars WHERE owner_id=$1 ORDER BY created_at DESC',[user.id])).rows,bookings:(await query('SELECT b.*,c.title,c.listing_number FROM rental_bookings b JOIN rental_cars c ON c.id=b.car_id WHERE c.owner_id=$1 ORDER BY b.created_at DESC LIMIT 200',[user.id])).rows};
 if(path===root+'/cars'&&method==='POST'){
  const b=carInput(await body(req)),id=randomUUID();
  return transaction(async c=>{const p=(await c.query('SELECT * FROM rental_profiles WHERE user_id=$1 FOR UPDATE',[user.id])).rows[0];if(!p||p.status!=='approved')fail(403,'Əvvəlcə icarə profiliniz admin tərəfindən yoxlanmalıdır.');const keys=Object.keys(b);const r=await c.query(`INSERT INTO rental_cars(id,owner_id,${keys.join(',')}) VALUES(${[id,user.id,...keys].map((_,i)=>'$'+(i+1)).join(',')}) RETURNING *`,[id,user.id,...keys.map(k=>k==='images'?JSON.stringify(b[k]):b[k])]);await audit(c,user,'car.create',id);return {car:r.rows[0],url:'/rentacar.html?car='+id};});
 }
 if(path===root+'/bookings'&&method==='GET')return {bookings:(await query('SELECT b.*,c.title,c.listing_number FROM rental_bookings b JOIN rental_cars c ON c.id=b.car_id WHERE b.renter_id=$1 ORDER BY b.created_at DESC LIMIT 200',[user.id])).rows};
 if(path===root+'/bookings'&&method==='POST'){
  const b=await body(req),id=randomUUID(),carId=uuid(b.car_id),key=uuid(b.client_key),days=rentalDates(b.starts_on,b.ends_on);
  return transaction(async c=>{
   // All create/confirm/cancel transitions lock the same parent row. This serializes races.
   const car=(await c.query('SELECT * FROM rental_cars WHERE id=$1 FOR UPDATE',[carId])).rows[0];if(!car||car.status!=='active')fail(404,'İcarə elanı aktiv deyil.');
   const prior=(await c.query('SELECT * FROM rental_bookings WHERE renter_id=$1 AND client_key=$2',[user.id,key])).rows[0];if(prior){if(prior.car_id!==carId||isoDay(prior.starts_on)!==b.starts_on||isoDay(prior.ends_on)!==b.ends_on)fail(409,'Sorğu açarı başqa rezervasiyaya aiddir.');return {booking:prior};}
   if(car.owner_id===user.id)fail(403,'Öz avtomobilinizi rezerv edə bilməzsiniz.');
   const p=(await c.query('SELECT status FROM rental_profiles WHERE user_id=$1',[car.owner_id])).rows[0];if(p?.status!=='approved')fail(409,'Sahib profili aktiv deyil.');
   await available(c,carId,b.starts_on,b.ends_on);
   const total=rentalQuote(car,days);if(b.expected_total_cents!==total)fail(409,'Qiymət dəyişib. Məbləği yenidən yoxlayın.');
   const snapshot={title:car.title,listing_number:car.listing_number,terms:car.terms,deposit_cents:car.deposit_cents,daily_cents:car.daily_cents,weekly_cents:car.weekly_cents,monthly_cents:car.monthly_cents,days};
   const r=await c.query('INSERT INTO rental_bookings(id,car_id,renter_id,starts_on,ends_on,total_cents,snapshot,client_key) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',[id,carId,user.id,b.starts_on,b.ends_on,total,JSON.stringify(snapshot),key]);await audit(c,user,'booking.request',id);return {booking:r.rows[0]};
  });
 }
 const transition=path.match(/^\/api\/rentacar\/bookings\/([a-f0-9-]+)\/(confirm|reject|cancel|complete)$/);
 if(transition&&method==='POST'){
  const id=uuid(transition[1]),action=transition[2];
  return transaction(async c=>{
   const ref=(await c.query('SELECT car_id FROM rental_bookings WHERE id=$1',[id])).rows[0];if(!ref)fail(404,'Rezervasiya tapılmadı.');
   const car=(await c.query('SELECT * FROM rental_cars WHERE id=$1 FOR UPDATE',[ref.car_id])).rows[0];
   const b=(await c.query('SELECT * FROM rental_bookings WHERE id=$1 FOR UPDATE',[id])).rows[0];
   const manager=user.role==='admin'||car.owner_id===user.id,customer=b.renter_id===user.id;if(!manager&&!customer)fail(404,'Rezervasiya tapılmadı.');
   if(action!=='cancel'&&!manager)fail(403,'Bu əməliyyat üçün icazəniz yoxdur.');
   const next={confirm:'confirmed',reject:'rejected',cancel:'cancelled',complete:'completed'}[action];if(b.status===next)return {booking:b};
   if(action==='complete'){if(b.status!=='confirmed'||isoDay(b.ends_on)>day())fail(409,'İcarə müddəti hələ tamamlanmayıb.');}
   else if(action==='cancel'){if(!['pending','confirmed'].includes(b.status))fail(409,'Rezervasiya artıq bağlanıb.');}
   else if(b.status!=='pending')fail(409,'Yalnız gözləyən rezervasiya dəyişdirilə bilər.');
   if(action==='confirm'){
    if(car.status!=='active'||(await c.query('SELECT status FROM rental_profiles WHERE user_id=$1',[car.owner_id])).rows[0]?.status!=='approved')fail(409,'Elan və sahib təsdiqlənmiş olmalıdır.');
    if(isoDay(b.starts_on)<day())fail(409,'Keçmiş rezervasiya təsdiqlənə bilməz.');
    await available(c,car.id,b.starts_on,b.ends_on,id);
   }
   const r=await c.query('UPDATE rental_bookings SET status=$1 WHERE id=$2 RETURNING *',[next,id]);await audit(c,user,'booking.'+action,id);return {booking:r.rows[0]};
  });
 }
 if(path===root+'/admin'&&method==='GET'){
  requireAdmin(user);return {profiles:(await query('SELECT * FROM rental_profiles ORDER BY created_at DESC LIMIT 200')).rows,cars:(await query(`SELECT ${publicCar} FROM rental_cars c JOIN rental_profiles p ON p.user_id=c.owner_id ORDER BY c.created_at DESC LIMIT 200`)).rows,bookings:(await query('SELECT b.*,c.title FROM rental_bookings b JOIN rental_cars c ON c.id=b.car_id ORDER BY b.created_at DESC LIMIT 200')).rows,audit:(await query('SELECT * FROM rental_audit ORDER BY created_at DESC LIMIT 100')).rows};
 }
 const moderation=path.match(/^\/api\/rentacar\/admin\/(profiles|cars)\/([a-f0-9-]+)$/);
 if(moderation&&method==='PATCH'){
  requireAdmin(user);const b=await body(req),id=uuid(moderation[2]),isProfile=moderation[1]==='profiles';
  if(!(isProfile?['approved','rejected']:['active','rejected','archived']).includes(b.status))fail(400,'Status düzgün deyil.');
  const note=text(b.note||'','Yoxlama qeydi',0,500);if(isProfile&&note.length<10)fail(400,'Yoxlama nəticəsini qeyd edin.');
  return transaction(async c=>{
   if(!isProfile&&b.status==='active'){
    const p=(await c.query('SELECT p.status FROM rental_profiles p JOIN rental_cars c ON c.owner_id=p.user_id WHERE c.id=$1',[id])).rows[0];if(p?.status!=='approved')fail(409,'Əvvəlcə sahib profili təsdiqlənməlidir.');
   }
   const r=await c.query(isProfile?'UPDATE rental_profiles SET status=$1,review_note=$2 WHERE user_id=$3 RETURNING *':'UPDATE rental_cars SET status=$1 WHERE id=$2 RETURNING *',isProfile?[b.status,note,id]:[b.status,id]);if(!r.rows.length)fail(404,'Qeyd tapılmadı.');await audit(c,user,'moderation.'+moderation[1],id,{status:b.status,note});return {record:r.rows[0]};
  });
 }
 fail(404,'İcarə sorğusu tapılmadı.');
}
async function available(c,car,start,end,except=null){
 const r=await c.query("SELECT id FROM rental_bookings WHERE car_id=$1 AND status='confirmed' AND starts_on<$3::date AND ends_on>$2::date AND ($4::uuid IS NULL OR id<>$4::uuid) LIMIT 1",[car,start,end,except]);if(r.rows.length)fail(409,'Bu avtomobil seçilən tarixlərdə artıq rezerv olunub.');
}
