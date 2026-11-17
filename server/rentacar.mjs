import {quoteRental,rentalToday} from '../assets/rentacar-shared.js';
import {randomUUID} from 'node:crypto';
import {query,transaction} from './db.mjs';
import {rentalUpload} from './rentacar-media.mjs';
import {body,fail,requireUser,requireAdmin,text,uuid,rateLimit} from './security.mjs';
export const rentalEnabled=()=>process.env.RENTACAR_ENABLED==='true'&&(process.env.VERCEL_ENV==='production'?process.env.RENTACAR_PRODUCTION_APPROVED==='true':process.env.RENTACAR_ISOLATED_DB==='true');
const day=rentalToday;
function pageParams(params){const page=Number(params.get('page')||1);if(!Number.isSafeInteger(page)||page<1||page>100000)fail(400,'Səhifə düzgün deyil.');return {page,limit:24,offset:(page-1)*24};}

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
 const images=b.images.map(v=>{if(typeof v!=='string'||v.length>1200)fail(400,'Şəkil ünvanı düzgün deyil.');if(process.env.LOCAL_DATABASE==='true'&&!process.env.VERCEL&&/^\/media\/[a-f0-9-]+\.webp$/.test(v))return v;let u;try{u=new URL(v);}catch{fail(400,'HTTPS şəkil ünvanı tələb olunur.');}if(u.protocol!=='https:'||u.username||u.password)fail(400,'HTTPS şəkil ünvanı tələb olunur.');return u.href;});
 return {title:text(b.title,'Başlıq',3,120),city:text(b.city,'Şəhər',2,80),vehicle_type:b.vehicle_type,year:b.year,images,daily_cents:cents(b.daily_cents),weekly_cents:cents(b.weekly_cents),monthly_cents:cents(b.monthly_cents),deposit_cents:cents(b.deposit_cents,true),terms:text(b.terms,'İcarə şərtləri',20,3000)};
}
const publicCar=`c.*,p.name AS owner_name,p.kind AS owner_kind,p.phone AS owner_phone`;
const notify=(c,id,message)=>c.query('INSERT INTO notifications(id,user_id,body) VALUES($1,$2,$3)',[randomUUID(),id,message]);
const audit=(c,user,action,id,detail={})=>c.query('INSERT INTO rental_audit(id,actor_id,action,subject_id,detail) VALUES($1,$2,$3,$4,$5)',[randomUUID(),user.id,action,id,JSON.stringify(detail)]);
export async function rentacar(req,user,path,method,url){
 if(!rentalEnabled())fail(503,'Rent a Car hazırda dizayn önizləməsidir. Real rezervasiya aktiv deyil.');
 const root='/api/rentacar';
 if(path===root+'/cars'&&method==='GET'){
  const p=url.searchParams,args=[],where=["c.status='active'","p.status='approved'"];
  if(p.get('owner_id')){args.push(uuid(p.get('owner_id')));where.push(`c.owner_id=$${args.length}`);}
  for(const key of ['city','vehicle_type'])if(p.get(key)){args.push(text(p.get(key),key,1,80));where.push(`c.${key}=$${args.length}`);}
  if(p.has('start')||p.has('end')){rentalDates(p.get('start'),p.get('end'));args.push(p.get('start'),p.get('end'));where.push(`NOT EXISTS(SELECT 1 FROM rental_bookings b WHERE b.car_id=c.id AND b.status='confirmed' AND b.starts_on<$${args.length}::date AND b.ends_on>$${args.length-1}::date)`);}
  const paging=pageParams(p),count=(await query(`SELECT count(*)::integer AS total FROM rental_cars c JOIN rental_profiles p ON p.user_id=c.owner_id WHERE ${where.join(' AND ')}`,args)).rows[0].total;args.push(paging.limit,paging.offset);
  return {page:paging.page,total:count,cars:(await query(`SELECT ${publicCar} FROM rental_cars c JOIN rental_profiles p ON p.user_id=c.owner_id WHERE ${where.join(' AND ')} ORDER BY c.created_at DESC,c.id DESC LIMIT $${args.length-1} OFFSET $${args.length}`,args)).rows};
 }
 const detail=path.match(/^\/api\/rentacar\/cars\/([a-f0-9-]+)$/);
 if(detail&&method==='GET'){
  const car=(await query(`SELECT ${publicCar} FROM rental_cars c JOIN rental_profiles p ON p.user_id=c.owner_id WHERE c.id=$1 AND c.status='active' AND p.status='approved'`,[uuid(detail[1])])).rows[0];if(!car)fail(404,'İcarə elanı tapılmadı.');return {car,url:'/rentacar.html?car='+car.id};
 }
 if(path===root+'/companies'&&method==='GET'){
  const {page,limit,offset}=pageParams(url.searchParams);
  const total=(await query("SELECT count(*)::integer AS total FROM rental_profiles WHERE status='approved' AND kind='company'")).rows[0].total;
  const companies=(await query("SELECT p.user_id,p.name,p.city,(SELECT count(*)::integer FROM rental_cars c WHERE c.owner_id=p.user_id AND c.status='active') AS car_count FROM rental_profiles p WHERE p.status='approved' AND p.kind='company' ORDER BY p.name,p.user_id LIMIT $1 OFFSET $2",[limit,offset])).rows;
  return {companies,total,page};
 }
 const profile=path.match(/^\/api\/rentacar\/profiles\/([a-f0-9-]+)$/);
 if(profile&&method==='GET'){
  const p=(await query("SELECT user_id,name,kind,city,phone FROM rental_profiles WHERE user_id=$1 AND status='approved' AND kind='company'",[uuid(profile[1])])).rows[0];if(!p)fail(404,'Şirkət tapılmadı.');
  const {page,limit,offset}=pageParams(url.searchParams),total=(await query("SELECT count(*)::integer AS total FROM rental_cars WHERE owner_id=$1 AND status='active'",[p.user_id])).rows[0].total;
  return {profile:p,total,page,cars:(await query(`SELECT ${publicCar} FROM rental_cars c JOIN rental_profiles p ON p.user_id=c.owner_id WHERE c.owner_id=$1 AND c.status='active' ORDER BY c.created_at DESC,c.id DESC LIMIT $2 OFFSET $3`,[p.user_id,limit,offset])).rows};
 }
 const calendar=path.match(/^\/api\/rentacar\/cars\/([a-f0-9-]+)\/calendar$/);
 if(calendar&&method==='GET'){
  const car=(await query("SELECT c.id FROM rental_cars c JOIN rental_profiles p ON p.user_id=c.owner_id WHERE c.id=$1 AND c.status='active' AND p.status='approved'",[uuid(calendar[1])])).rows[0];if(!car)fail(404,'Elan tapılmadı.');
  return {intervals:(await query("SELECT starts_on,ends_on FROM rental_bookings WHERE car_id=$1 AND status='confirmed' AND ends_on>=CURRENT_DATE ORDER BY starts_on LIMIT 100",[car.id])).rows};
 }
 requireUser(user);
 let actingOwner=user.id;
 if(url.searchParams.has('owner_id')){requireAdmin(user);actingOwner=uuid(url.searchParams.get('owner_id'));}

 if(path===root+'/uploads'&&method==='POST'){if((await query('SELECT status FROM rental_profiles WHERE user_id=$1',[actingOwner])).rows[0]?.status!=='approved')fail(403,'Şəkil yükləmək üçün sahib profili təsdiqlənməlidir.');await rateLimit('rental-upload:'+actingOwner,40,3600);return rentalUpload({...user,id:actingOwner},await body(req));}
 if(path===root+'/profile'&&method==='POST'){
  const b=await body(req);if(!['company','individual'].includes(b.kind))fail(400,'Sahib tipini seçin.');
  const phone=text(b.phone,'Telefon',9,25);if(!/^\+?[0-9 ()-]+$/.test(phone))fail(400,'Telefon düzgün deyil.');
  const values=[actingOwner,b.kind,text(b.name,'Ad',2,120),text(b.city,'Şəhər',2,80),phone];
  const p=await transaction(async c=>{const r=await c.query(`INSERT INTO rental_profiles(user_id,kind,name,city,phone) VALUES($1,$2,$3,$4,$5) ON CONFLICT(user_id) DO NOTHING RETURNING *`,values);if(!r.rows.length)fail(409,'İcarə profiliniz artıq mövcuddur.');await audit(c,user,'profile.create',actingOwner);return r.rows[0];});return {profile:p};
 }
 if(path===root+'/profile'&&method==='PATCH'){
  const b=await body(req),name=text(b.name,'Ad',2,120),city=text(b.city,'Şəhər',2,80),phone=text(b.phone,'Telefon',9,25);if(!/^\+?[0-9 ()-]+$/.test(phone))fail(400,'Telefon düzgün deyil.');
  return transaction(async c=>{const r=await c.query("UPDATE rental_profiles SET name=$1,city=$2,phone=$3,status='pending',review_note='' WHERE user_id=$4 RETURNING *",[name,city,phone,actingOwner]);if(!r.rows.length)fail(404,'Profil tapılmadı.');await audit(c,user,'profile.edit',actingOwner);return {profile:r.rows[0]};});
 }
 if(path===root+'/owner'&&method==='GET')return {profile:(await query('SELECT * FROM rental_profiles WHERE user_id=$1',[actingOwner])).rows[0]||null,cars:(await query('SELECT * FROM rental_cars WHERE owner_id=$1 ORDER BY created_at DESC',[actingOwner])).rows,bookings:(await query('SELECT b.*,c.title,c.listing_number FROM rental_bookings b JOIN rental_cars c ON c.id=b.car_id WHERE c.owner_id=$1 ORDER BY b.created_at DESC LIMIT 200',[actingOwner])).rows};
 if(path===root+'/cars'&&method==='POST'){
  const input=await body(req),b=carInput(input),id=randomUUID();
  return transaction(async c=>{const p=(await c.query('SELECT * FROM rental_profiles WHERE user_id=$1 FOR UPDATE',[actingOwner])).rows[0];if(!p||p.status!=='approved')fail(403,'Əvvəlcə icarə profiliniz admin tərəfindən yoxlanmalıdır.');const keys=Object.keys(b);const r=await c.query(`INSERT INTO rental_cars(id,owner_id,${keys.join(',')}) VALUES(${[id,actingOwner,...keys].map((_,i)=>'$'+(i+1)).join(',')}) RETURNING *`,[id,actingOwner,...keys.map(k=>k==='images'?JSON.stringify(b[k]):b[k])]);await attachMedia(c,{...user,id:actingOwner},id,input.media_ids);await audit(c,user,'car.create',id);return {car:r.rows[0],url:'/rentacar.html?car='+id};});
 }

 if(detail&&['PUT','PATCH'].includes(method)){
  const id=uuid(detail[1]),input=await body(req);
  return transaction(async c=>{
   const car=(await c.query('SELECT * FROM rental_cars WHERE id=$1 FOR UPDATE',[id])).rows[0];if(!car||(car.owner_id!==user.id&&user.role!=='admin'))fail(404,'Elan tapılmadı.');
   const active=(await c.query("SELECT id FROM rental_bookings WHERE car_id=$1 AND status='confirmed' AND ends_on>CURRENT_DATE LIMIT 1",[id])).rows.length;
   if(active)fail(409,'Təsdiqlənmiş aktiv rezervasiyalar bitmədən elan dəyişdirilə bilməz.');
   if(method==='PATCH'){
    if(input.status!=='archived')fail(400,'Bu əməliyyat yalnız arxivləşdirmək üçündür.');
    await c.query("UPDATE rental_cars SET status='archived' WHERE id=$1",[id]);await audit(c,user,'car.archive',id);return {ok:true};
   }
   if((await c.query('SELECT status FROM rental_profiles WHERE user_id=$1',[car.owner_id])).rows[0]?.status!=='approved')fail(403,'Sahib profili təsdiqlənməlidir.');
   const b=carInput(input),keys=Object.keys(b),args=keys.map(k=>k==='images'?JSON.stringify(b[k]):b[k]);args.push(id);
   const r=await c.query(`UPDATE rental_cars SET ${keys.map((k,i)=>`${k}=$${i+1}`).join(',')},status='pending' WHERE id=$${args.length} RETURNING *`,args);
   await attachMedia(c,{...user,id:car.owner_id},id,input.media_ids);await audit(c,user,'car.edit',id);return {car:r.rows[0]};
  });
 }
 if(path===root+'/bookings'&&method==='GET')return {bookings:(await query('SELECT b.*,c.title,c.listing_number FROM rental_bookings b JOIN rental_cars c ON c.id=b.car_id WHERE b.renter_id=$1 ORDER BY b.created_at DESC LIMIT 200',[user.id])).rows};
 if(path===root+'/bookings'&&method==='POST'){
  const b=await body(req),id=randomUUID(),carId=uuid(b.car_id),key=uuid(b.client_key),days=rentalDates(b.starts_on,b.ends_on);
  const phone=text(b.phone||user.phone||'','Əlaqə telefonu',9,25);if(!/^\+?[0-9 ()-]+$/.test(phone))fail(400,'Əlaqə telefonu düzgün deyil.');
  return transaction(async c=>{
   // All create/confirm/cancel transitions lock the same parent row. This serializes races.
   const car=(await c.query('SELECT * FROM rental_cars WHERE id=$1 FOR UPDATE',[carId])).rows[0];if(!car||car.status!=='active')fail(404,'İcarə elanı aktiv deyil.');
   const prior=(await c.query('SELECT * FROM rental_bookings WHERE renter_id=$1 AND client_key=$2',[user.id,key])).rows[0];if(prior){if(prior.car_id!==carId||isoDay(prior.starts_on)!==b.starts_on||isoDay(prior.ends_on)!==b.ends_on)fail(409,'Sorğu açarı başqa rezervasiyaya aiddir.');return {booking:prior};}
   if(car.owner_id===user.id)fail(403,'Öz avtomobilinizi rezerv edə bilməzsiniz.');
   const p=(await c.query('SELECT status FROM rental_profiles WHERE user_id=$1',[car.owner_id])).rows[0];if(p?.status!=='approved')fail(409,'Sahib profili aktiv deyil.');
   await available(c,carId,b.starts_on,b.ends_on);
   const total=rentalQuote(car,days);if(b.expected_total_cents!==total)fail(409,'Qiymət dəyişib. Məbləği yenidən yoxlayın.');
   const snapshot={title:car.title,listing_number:car.listing_number,terms:car.terms,deposit_cents:car.deposit_cents,daily_cents:car.daily_cents,weekly_cents:car.weekly_cents,monthly_cents:car.monthly_cents,days};
   const finance=(await c.query('SELECT * FROM rental_finance_settings WHERE id=1')).rows[0];
   const commission=Math.round(total*finance.commission_bps/10000);
   const r=await c.query('INSERT INTO rental_bookings(id,car_id,renter_id,starts_on,ends_on,total_cents,snapshot,client_key,renter_phone,commission_bps,commission_cents,commission_configured) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *',[id,carId,user.id,b.starts_on,b.ends_on,total,JSON.stringify(snapshot),key,phone,finance.commission_bps,commission,finance.configured]);await notify(c,car.owner_id,'Rent a Car: '+car.title+' üçün yeni rezervasiya sorğusu var.');await audit(c,user,'booking.request',id);return {booking:r.rows[0]};
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
   const r=await c.query('UPDATE rental_bookings SET status=$1 WHERE id=$2 RETURNING *',[next,id]);await notify(c,b.renter_id,'Rent a Car: '+car.title+' — rezervasiya statusu: '+next);if(user.id!==car.owner_id)await notify(c,car.owner_id,'Rent a Car: '+car.title+' — rezervasiya statusu: '+next);await audit(c,user,'booking.'+action,id);return {booking:r.rows[0]};
  });
 }
 if(path===root+'/admin/profiles'&&method==='POST'){
  requireAdmin(user);const b=await body(req);if(!['company','individual'].includes(b.kind))fail(400,'Sahib tipini seçin.');
  const account=text(b.account,'Hesabın istifadəçi adı',2,100),name=text(b.name,'Ad',2,120),city=text(b.city,'Şəhər',2,80),phone=text(b.phone,'Telefon',9,25);
  if(!/^\+?[0-9 ()-]+$/.test(phone))fail(400,'Telefon düzgün deyil.');
  return transaction(async c=>{const owner=(await c.query('SELECT id FROM users WHERE lower(username)=lower($1)',[account])).rows[0];if(!owner)fail(404,'Mövcud SosAvto hesabı tapılmadı. Sahib əvvəl qeydiyyatdan keçməlidir.');
   const r=await c.query('INSERT INTO rental_profiles(user_id,kind,name,city,phone) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING RETURNING *',[owner.id,b.kind,name,city,phone]);if(!r.rows.length)fail(409,'Bu hesabın icarə profili artıq var.');await audit(c,user,'profile.create-on-behalf',owner.id);await notify(c,owner.id,'Admin sizin adınızdan icarə profili yaradıb. Profil yoxlamadadır.');return {profile:r.rows[0]};});
 }
 if(path===root+'/finance'&&method==='GET'){
  const admin=user.role==='admin',args=admin?[]:[user.id];
  const rows=(await query(`SELECT b.id,b.status,b.total_cents,b.commission_bps,b.commission_cents,b.commission_configured,c.owner_id,c.title,p.name AS owner_name,r.id AS receipt_id,r.reference,r.created_at AS received_at FROM rental_bookings b JOIN rental_cars c ON c.id=b.car_id JOIN rental_profiles p ON p.user_id=c.owner_id LEFT JOIN rental_commission_receipts r ON r.booking_id=b.id ${admin?'':'WHERE c.owner_id=$1'} ORDER BY b.created_at DESC`,args)).rows;
  return {settings:(await query('SELECT commission_bps,configured FROM rental_finance_settings WHERE id=1')).rows[0],online_payments:false,collection_mode:'owner_collects_rental',entries:rows};
 }
 if(path===root+'/admin/finance/settings'&&method==='PATCH'){
  requireAdmin(user);const b=await body(req);if(!Number.isInteger(b.commission_bps)||b.commission_bps<0||b.commission_bps>10000)fail(400,'Komissiya 0–100% olmalıdır.');
  return transaction(async c=>{await c.query('UPDATE rental_finance_settings SET commission_bps=$1,configured=true,updated_at=now() WHERE id=1',[b.commission_bps]);await audit(c,user,'finance.settings',user.id,{commission_bps:b.commission_bps});return {ok:true};});
 }
 const receipt=path.match(/^\/api\/rentacar\/admin\/finance\/([a-f0-9-]+)\/receive$/);
 if(receipt&&method==='POST'){
  requireAdmin(user);const b=await body(req),id=uuid(receipt[1]),reference=text(b.reference,'Bank/kassa qəbzinin istinad nömrəsi',3,150);
  return transaction(async c=>{const booking=(await c.query('SELECT * FROM rental_bookings WHERE id=$1 FOR UPDATE',[id])).rows[0];if(!booking)fail(404,'Rezervasiya tapılmadı.');
   const prior=(await c.query('SELECT * FROM rental_commission_receipts WHERE booking_id=$1',[id])).rows[0];if(prior){if(prior.reference!==reference)fail(409,'Bu komissiya artıq qeydə alınıb.');return {receipt:prior};}
   if(booking.status!=='completed'||!booking.commission_configured||booking.commission_cents<=0)fail(409,'Yalnız tamamlanmış və komissiyası əvvəlcədən müəyyən edilmiş icarə üzrə qəbz yazıla bilər.');
   if((await c.query('SELECT id FROM rental_commission_receipts WHERE reference=$1',[reference])).rows.length)fail(409,'Bu qəbz istinadı artıq istifadə olunub.');
   const r=await c.query('INSERT INTO rental_commission_receipts(id,booking_id,amount_cents,reference,actor_id) VALUES($1,$2,$3,$4,$5) RETURNING *',[randomUUID(),id,booking.commission_cents,reference,user.id]);await audit(c,user,'finance.commission-received',id,{amount_cents:booking.commission_cents,reference});return {receipt:r.rows[0]};});
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
   const r=await c.query(isProfile?'UPDATE rental_profiles SET status=$1,review_note=$2 WHERE user_id=$3 RETURNING *':'UPDATE rental_cars SET status=$1 WHERE id=$2 RETURNING *',isProfile?[b.status,note,id]:[b.status,id]);if(!r.rows.length)fail(404,'Qeyd tapılmadı.');await notify(c,isProfile?id:r.rows[0].owner_id,'Rent a Car: '+(isProfile?'Profiliniz':'Elanınız')+' — '+b.status+(note?' · '+note:''));await audit(c,user,'moderation.'+moderation[1],id,{status:b.status,note});return {record:r.rows[0]};
  });
 }
 fail(404,'İcarə sorğusu tapılmadı.');
}
async function available(c,car,start,end,except=null){
 const r=await c.query("SELECT id FROM rental_bookings WHERE car_id=$1 AND status='confirmed' AND starts_on<$3::date AND ends_on>$2::date AND ($4::uuid IS NULL OR id<>$4::uuid) LIMIT 1",[car,start,end,except]);if(r.rows.length)fail(409,'Bu avtomobil seçilən tarixlərdə artıq rezerv olunub.');
}

async function attachMedia(c,user,carId,ids=[]){
 if(!Array.isArray(ids)||ids.length>12)fail(400,'Şəkil siyahısı düzgün deyil.');
 for(const id of new Set(ids)){const r=await c.query('UPDATE rental_media SET car_id=$1 WHERE id=$2 AND owner_id=$3 AND (car_id IS NULL OR car_id=$1) RETURNING id',[carId,uuid(id),user.id]);if(!r.rows.length)fail(403,'Şəkil sizin hesabınıza aid deyil.');}
}
