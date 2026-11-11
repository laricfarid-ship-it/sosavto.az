import {randomUUID} from 'node:crypto';
import {query} from './db.mjs';
import {fail,requireUser,body,text} from './security.mjs';
import {projection} from './listings.mjs';

const slugPattern=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export async function dealership(req,user,path,method){
 if(path==='/api/dealerships/mine'&&method==='GET'){
  requireUser(user);
  const r=await query('SELECT id,slug,display_name,description,logo_url,banner_url,public_phone,address,city,status FROM dealership_profiles WHERE owner_user_id=$1',[user.id]);
  return {profile:r.rows[0]||null};
 }
 if(path==='/api/dealerships/apply'&&method==='POST'){
  requireUser(user);
  const b=await body(req);
  const name=text(b.display_name,'Salon adı',2,120);
  const slug=text(b.slug,'Salon linki',3,70).toLowerCase();
  if(!slugPattern.test(slug))fail(400,'Salon linkində yalnız kiçik latın hərfləri, rəqəmlər və tire istifadə edin.');
  const city=text(b.city||'','Şəhər',0,80);
  const phone=text(b.public_phone||'','Əlaqə nömrəsi',0,25);
  try{
   const r=await query(`INSERT INTO dealership_profiles(id,owner_user_id,slug,display_name,city,public_phone) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,status,slug`,[randomUUID(),user.id,slug,name,city,phone]);
   return {profile:r.rows[0]};
  }catch(e){if(e.code==='23505')fail(409,'Bu hesabın salon müraciəti artıq var və ya salon linki tutulub.');throw e;}
 }
 const match=path.match(/^\/api\/dealerships\/([a-z0-9-]+)$/);
 if(match&&method==='GET'){
  const slug=match[1];if(!slugPattern.test(slug))fail(404,'Salon tapılmadı.');
  const r=await query("SELECT id,owner_user_id,slug,display_name,description,logo_url,banner_url,public_phone,address,city FROM dealership_profiles WHERE slug=$1 AND status='approved'",[slug]);
  const p=r.rows[0];if(!p)fail(404,'Salon tapılmadı.');
  const rows=await query(`SELECT ${projection} FROM listings l WHERE l.user_id=$1 AND l.status='active' AND l.category='car' AND NOT (l.details @> '{"_deleted":true}'::jsonb) ORDER BY l.created_at DESC LIMIT 100`,[p.owner_user_id]);
  const {owner_user_id,...publicProfile}=p;
  return {profile:publicProfile,listings:rows.rows};
 }
 fail(404,'Sorğu tapılmadı.');
}
