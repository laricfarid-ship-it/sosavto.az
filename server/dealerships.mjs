import {randomUUID} from 'node:crypto';
import {query,transaction} from './db.mjs';
import {fail,requireUser,requireAdmin,body,text,uuid,rateLimit} from './security.mjs';
import {upload} from './uploads.mjs';

const slugPattern=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const fields='id,slug,display_name,description,logo_url,banner_url,public_phone,address,city,status';
export function dealershipInput(b,{slug=true}={}){
 const p={display_name:text(b.display_name,'Salon adı',2,120),description:text(b.description||'','Salon haqqında',0,2000),city:text(b.city||'','Şəhər',0,80),address:text(b.address||'','Ünvan',0,250),public_phone:text(b.public_phone||'','Əlaqə nömrəsi',0,25)};
 if(p.public_phone&&!/^(\+994|0)\d{9}$/.test(p.public_phone.replace(/[\s()-]/g,'')))fail(400,'Azərbaycan telefon nömrəsini düzgün yazın.');
 for(const key of ['logo_url','banner_url']){p[key]=text(b[key]||'','Şəkil ünvanı',0,1000);if(p[key]&&!(/^https:\/\//i.test(p[key])||/^\/media\/[a-f0-9-]+\.webp$/.test(p[key])))fail(400,'Şəkil üçün HTTPS ünvanı seçin.');}
 if(slug){p.slug=text(b.slug,'Salon linki',3,70).toLowerCase();if(!slugPattern.test(p.slug)||['mine','apply','admin','media','directory'].includes(p.slug))fail(400,'Salon linkində latın hərfləri, rəqəmlər və tire istifadə edin.');}
 return p;
}
export async function createDealership(c,owner,p){
 try{return (await c.query(`INSERT INTO dealership_profiles(id,owner_user_id,slug,display_name,description,city,address,public_phone,logo_url,banner_url) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING ${fields}`,[randomUUID(),owner,p.slug,p.display_name,p.description,p.city,p.address,p.public_phone,p.logo_url,p.banner_url])).rows[0];}
 catch(e){if(e.code==='23505')fail(409,'Bu hesabın salon müraciəti artıq var və ya salon linki tutulub.');throw e;}
}
export async function dealership(req,user,path,method){
 const params=new URL(req.url||path,'http://localhost').searchParams;
 if(path==='/api/dealerships/mine'){
  requireUser(user);
  if(method==='GET')return {profile:(await query(`SELECT ${fields} FROM dealership_profiles WHERE owner_user_id=$1`,[user.id])).rows[0]||null};
  if(method==='PATCH'){
   const p=dealershipInput(await body(req),{slug:false});
   const r=await query(`UPDATE dealership_profiles SET display_name=$2,description=$3,city=$4,address=$5,public_phone=$6,logo_url=$7,banner_url=$8,status=CASE WHEN display_name<>$2 OR status='rejected' THEN 'pending' ELSE status END,updated_at=now() WHERE owner_user_id=$1 AND status<>'suspended' RETURNING ${fields}`,[user.id,p.display_name,p.description,p.city,p.address,p.public_phone,p.logo_url,p.banner_url]);
   if(!r.rows.length)fail(409,'Salon tapılmadı və ya fəaliyyətinə məhdudiyyət qoyulub.');return {profile:r.rows[0]};
  }
 }
 if(path==='/api/dealerships/media'&&method==='POST'){
  requireUser(user);await rateLimit('salon:media:'+user.id,20,3600);
  const profile=await query("SELECT id FROM dealership_profiles WHERE owner_user_id=$1 AND status<>'suspended'",[user.id]);if(!profile.rows.length)fail(403,'Əvvəlcə salon müraciəti yaradın.');
  return upload(user,await body(req),{branding:true});
 }
 if(path==='/api/dealerships/apply'&&method==='POST'){
  requireUser(user);const p=dealershipInput(await body(req));return {profile:await createDealership({query},user.id,p)};
 }
 if(path==='/api/dealerships/directory'&&method==='GET'){
  const term=text(params.get('q')||'','Axtarış',0,120),city=text(params.get('city')||'','Şəhər',0,80),page=Math.max(1,Math.min(10000,Math.floor(Number(params.get('page'))||1)));
  const args=['%'+term+'%',city],where="p.status='approved' AND u.status='active' AND p.display_name ILIKE $1 AND ($2='' OR p.city=$2)";
  const total=(await query(`SELECT count(*)::integer n FROM dealership_profiles p JOIN users u ON u.id=p.owner_user_id WHERE ${where}`,args)).rows[0].n;
  const profiles=(await query(`SELECT p.slug,p.display_name,p.description,p.logo_url,p.banner_url,p.city,(SELECT count(*)::integer FROM listings l WHERE l.user_id=p.owner_user_id AND l.category='car' AND l.status='active' AND NOT(l.details @> '{"_deleted":true}'::jsonb)) AS listing_count FROM dealership_profiles p JOIN users u ON u.id=p.owner_user_id WHERE ${where} ORDER BY listing_count DESC,p.display_name,p.id LIMIT 24 OFFSET $3`,[...args,(page-1)*24])).rows;
  return {profiles,total,page,pages:Math.ceil(total/24)};
 }
 if(path==='/api/dealerships/admin'&&method==='GET'){
  requireAdmin(user);return {profiles:(await query('SELECT p.id,p.slug,p.display_name,p.city,p.status,p.created_at,u.fullname,u.email FROM dealership_profiles p JOIN users u ON u.id=p.owner_user_id ORDER BY p.created_at DESC LIMIT 200')).rows};
 }
 const decision=path.match(/^\/api\/dealerships\/admin\/([a-f0-9-]+)$/);
 if(decision&&method==='PATCH'){
  requireAdmin(user);const b=await body(req);if(!['approved','rejected','suspended'].includes(b.status))fail(400,'Status yanlışdır.');
  const id=uuid(decision[1]);return transaction(async c=>{const r=await c.query(`UPDATE dealership_profiles p SET status=$1,updated_at=now() WHERE p.id=$2 AND EXISTS(SELECT 1 FROM users u WHERE u.id=p.owner_user_id AND u.status='active') RETURNING p.id,p.status`,[b.status,id]);if(!r.rows.length)fail(404,'Salon tapılmadı və ya sahibinin hesabı bağlıdır.');await c.query('INSERT INTO audit_logs(id,admin_id,action,entity_id) VALUES($1,$2,$3,$4)',[randomUUID(),user.id,'dealership_'+b.status,id]);return {profile:r.rows[0]};});
 }
 const match=path.match(/^\/api\/dealerships\/([a-z0-9-]+)$/);
 if(match&&method==='GET'){
  const r=await query("SELECT p.* FROM dealership_profiles p JOIN users u ON u.id=p.owner_user_id WHERE p.slug=$1 AND p.status='approved' AND u.status='active'",[match[1]]);const p=r.rows[0];if(!p)fail(404,'Salon tapılmadı.');
  const args=[p.owner_user_id],where=["l.user_id=$1","l.status='active'","l.category='car'","NOT(l.details @> '{\"_deleted\":true}'::jsonb)"];
  const add=(sql,v)=>{args.push(v);where.push(sql.replace('?',`$${args.length}`));};
  for(const key of ['brand','model'])if(params.get(key))add('l.'+key+'=?',text(params.get(key),key,1,80));
  for(const [key,col,op]of [['price_min','price','>='],['price_max','price','<='],['year_min','year','>='],['year_max','year','<=']])if(params.get(key)){const v=Number(params.get(key));if(!Number.isFinite(v)||v<0||v>999999999)fail(400,'Filtr aralığı düzgün deyil.');add(`l.${col}${op}?`,v);}
  if(params.get('q'))add("concat_ws(' ',l.title,l.brand,l.model) ILIKE ?",'%'+text(params.get('q'),'Axtarış',1,120)+'%');
  for(const k of ['price','year'])if(params.get(k+'_min')&&params.get(k+'_max')&&Number(params.get(k+'_min'))>Number(params.get(k+'_max')))fail(400,'Minimum maksimumdan böyük ola bilməz.');
  const orders={newest:'l.created_at DESC,l.id',price_asc:'l.price ASC,l.id',price_desc:'l.price DESC,l.id',year_desc:'l.year DESC,l.id'},order=Object.hasOwn(orders,params.get('sort'))?orders[params.get('sort')]:orders.newest,page=Math.max(1,Math.min(10000,Math.floor(Number(params.get('page'))||1)));
  const total=(await query('SELECT count(*)::integer n FROM listings l WHERE '+where.join(' AND '),args)).rows[0].n;
  const listings=(await query(`SELECT l.id,l.listing_number,l.title,l.brand,l.model,l.year,l.mileage,l.price,l.city,l.created_at,(SELECT url FROM images i WHERE i.listing_id=l.id AND i.sort_order<100 ORDER BY i.sort_order,i.id LIMIT 1) AS image FROM listings l WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT 24 OFFSET $${args.length+1}`,[...args,(page-1)*24])).rows;
  const brands=(await query("SELECT DISTINCT brand FROM listings WHERE user_id=$1 AND status='active' AND category='car' AND NOT(details @> '{\"_deleted\":true}'::jsonb) ORDER BY brand",[p.owner_user_id])).rows.map(x=>x.brand);
  const {owner_user_id,...profile}=p;return {profile,listings,total,page,pages:Math.ceil(total/24),brands};
 }
 fail(404,'Sorğu tapılmadı.');
}
