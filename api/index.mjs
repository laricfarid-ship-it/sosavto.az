import {rentacar,rentalEnabled} from '../server/rentacar.mjs';
import {stories} from '../server/stories.mjs';
import {socialSharePreview,publishSocial,socialConfigured,socialShareEnabled,socialConnectionReport,instagramPostPermalink} from '../server/social-share.mjs';
import {adminEvent,pushApi} from '../server/admin-push.mjs';
import {resetEnabled,requestReset,completeReset} from '../server/password-reset.mjs';
import {imagesFor} from '../server/listing-media.mjs';
import {priceHistogram} from '../server/price-histogram.mjs';
import {preservePublishedPrice,publishPriceAlerts} from '../server/price-alerts.mjs';
import {assistantConfig,assistantAnswer} from '../server/assistant.mjs';
import {lockListing,washLinks,requireNoReservations,deleteListing} from '../server/listing-actions.mjs';
import {washEnabled} from '../server/wash-config.mjs';
import {randomUUID} from 'node:crypto';
import bcrypt from 'bcryptjs';
import {wash} from '../server/wash.mjs';
import {sos} from '../server/sos.mjs';
import {query,transaction} from '../server/db.mjs';
import {HttpError,fail,hash,safeUser,session,createSession,requireUser,requireAdmin,originCheck,rateLimit,clientAddress,body,text,uuid} from '../server/security.mjs';
import {listingInput,columns,projection,search} from '../server/listings.mjs';
import {dealership,dealershipInput,createDealership} from '../server/dealerships.mjs';
import {upload} from '../server/uploads.mjs';
import {dealershipSeo} from '../server/dealership-seo.mjs';
import {seoPage} from '../server/seo.mjs';
import {admin2fa,verifyAdminLogin,issueAdminChallenge,challengeUser,consumeChallenge} from '../server/admin-2fa.mjs';
const json=(res,status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(data));};
const notify=(c,user,body)=>c.query('INSERT INTO notifications(id,user_id,body) VALUES($1,$2,$3)',[randomUUID(),user,body]);
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 try{
 const url=new URL(req.url,'http://localhost'); const path=url.pathname.replace(/\/$/,'');const method=req.method;
 originCheck(req);
 if(path==='/api/config'&&method==='GET')return json(res,200,{passwordReset:resetEnabled(),wash:washEnabled(),sos:process.env.SOS_ENABLED==='true',ai:assistantConfig().enabled,aiProvider:assistantConfig().provider,uploads:!!(process.env.S3_BUCKET&&process.env.S3_PUBLIC_URL)||(process.env.LOCAL_DATABASE==='true'&&process.env.NODE_ENV!=='production'&&!process.env.VERCEL)});
 if(path==='/api/rentacar/config'&&method==='GET')return json(res,200,{enabled:rentalEnabled(),mode:process.env.VERCEL_ENV==='production'?'live':'test'});
 if(path.startsWith('/api/rentacar/')&&!rentalEnabled())return json(res,503,{error:'Rent a Car önizləmə rejimindədir. Real rezervasiya aktiv deyil.'});
 const address=clientAddress(req);
 await rateLimit(`api:ip:${address}`,300,60);
 if(['/sitemap.xml','/elan'].includes(path)&&['GET','HEAD'].includes(method))return seoPage(req,res,path,url);
 if(['/salon.html','/salon'].includes(path)&&['GET','HEAD'].includes(method))return dealershipSeo(req,res,url);
 const user=await session(req);
 if(path==='/api/admin/push')return json(res,200,await pushApi(req,user,method));
 if(path==='/api/admin/2fa/verify-login'&&method==='POST'){
  const pending=await challengeUser(req);if(!pending)fail(401,'Giriş müddəti bitdi. Yenidən daxil olun.');
  await rateLimit(`admin2fa-challenge:${pending.id}`,8,900);const b=await body(req);await verifyAdminLogin(req,res,pending,b.code);
  await transaction(async c=>{await c.query('DELETE FROM admin_login_challenges WHERE user_id=$1',[pending.id]);});
  const clearChallengeCookie=await consumeChallenge(req);const sessionCookie=await createSession(res,pending);res.setHeader('Set-Cookie',[sessionCookie,clearChallengeCookie]);await adminEvent('login',{id:pending.id,name:pending.fullname});return json(res,200,{user:safeUser(pending)});
 }
 if(user&&!['GET','HEAD','OPTIONS'].includes(method))await rateLimit(`write:${user.id}`,120,60);
 if(path==='/api/stories'||path.startsWith('/api/stories/'))return json(res,method==='POST'&&path==='/api/stories'?201:200,await stories(req,user,path,method,url));
 if(path.startsWith('/api/dealerships/'))return json(res,method==='POST'?201:200,await dealership(req,user,path,method));
 if(path.startsWith('/api/wash/'))return json(res,200,await wash(req,user,path,method));
 if(path.startsWith('/api/sos/'))return json(res,200,await sos(req,user,path,method));
 if(path.startsWith('/api/rentacar/'))return json(res,200,await rentacar(req,user,path,method,url));
 if(path==='/api/me'&&method==='GET')return json(res,200,{user:safeUser(user)});
 if(['/api/register','/api/login'].includes(path)&&method==='POST'){
 await rateLimit(`auth:ip:${address}`,60,900);
 if(path==='/api/register')await rateLimit(`register:ip:${address}`,10,3600);
 // Bound rotating-identifier traffic before creating per-identifier buckets.
 await rateLimit('auth:global',1000,900);
 const b=await body(req);const identifier=text(b.identifier||b.email||'','Email və ya istifadəçi adı',3,200).toLowerCase();
 await rateLimit(`auth:${identifier}`,10,900);
 const password=text(b.password,'Şifrə',10,72);if(Buffer.byteLength(password)>72)fail(400,'Şifrə 72 baytdan uzun ola bilməz.');
 if(path==='/api/register'){
 const email=identifier;if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail(400,'Email ünvanını düzgün yazın.');
 const username=text(b.username,'İstifadəçi adı',3,30).toLowerCase();if(!/^[a-z0-9_]+$/.test(username))fail(400,'İstifadəçi adı üçün latın hərfləri, rəqəm və alt xətt istifadə edin.');
 const fullname=text(b.fullname,'Ad və soyad',2,100);const id=randomUUID();
 const salon=b.account_type==='salon'?dealershipInput(b):null;
 try{const passwordHash=await bcrypt.hash(password,12);await transaction(async c=>{await c.query('INSERT INTO users(id,fullname,username,email,password_hash) VALUES($1,$2,$3,$4,$5)',[id,fullname,username,email,passwordHash]);if(salon)await createDealership(c,id,salon);});}catch(e){if(e.code==='23505')fail(409,'Bu email və ya istifadəçi adı artıq istifadə olunur.');throw e;}
 const u=(await query('SELECT * FROM users WHERE id=$1',[id])).rows[0];await createSession(res,u);await adminEvent('register',{id:u.id,name:u.fullname});return json(res,201,{user:safeUser(u)});
 }
 const u=(await query('SELECT * FROM users WHERE email=$1 OR username=$1',[identifier])).rows[0];
 const valid=await bcrypt.compare(password,u?.password_hash||'$2b$12$XU7.1nUi/iCTy4lYfsZnGO9DZdvNU91FdY56dLg47/O85VzVFhUUe');
 if(!u||!valid||u.status!=='active')fail(401,'Giriş məlumatları düzgün deyil.');
 if(u.role==='admin'&&(await query('SELECT enabled FROM admin_totp WHERE user_id=$1',[u.id])).rows[0]?.enabled){
  await issueAdminChallenge(res,u);return json(res,200,{requires2fa:true});
 }
 await createSession(res,u);await adminEvent('login',{id:u.id,name:u.fullname});return json(res,200,{user:safeUser(u)});
 }
 if(['/api/password-reset/request','/api/password-reset/complete'].includes(path)&&method==='POST'){
 await rateLimit(`recovery:ip:${address}`,10,900);const b=await body(req);return json(res,200,await (path.endsWith('/request')?requestReset(b):completeReset(b)));
 }
 if(path==='/api/logout'&&method==='POST'){
 const token=(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('sosavto_session='))?.slice(16);if(token)await query('DELETE FROM sessions WHERE token_hash=$1',[hash(token)]);
 res.setHeader('Set-Cookie',`sosavto_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${process.env.NODE_ENV==='production'||process.env.VERCEL?'; Secure':''}`);return json(res,200,{ok:true});
 }
 if(path==='/api/me'&&method==='PATCH'){
 requireUser(user);const b=await body(req);await query('UPDATE users SET fullname=$1,phone=$2 WHERE id=$3',[text(b.fullname,'Ad',2,100),text(b.phone||'','Telefon',0,25),user.id]);return json(res,200,{ok:true});
 }
 if(path==='/api/password'&&method==='POST'){
 requireUser(user);await rateLimit(`password:${user.id}`,5,900);const b=await body(req);if(!await bcrypt.compare(text(b.current,'Cari şifrə',1,72),user.password_hash))fail(400,'Cari şifrə düzgün deyil.');
 const password=text(b.password,'Yeni şifrə',10,72);if(Buffer.byteLength(password)>72)fail(400,'Şifrə çox uzundur.');
 await transaction(async c=>{await c.query('UPDATE users SET password_hash=$1 WHERE id=$2',[await bcrypt.hash(password,12),user.id]);await c.query('DELETE FROM sessions WHERE user_id=$1',[user.id]);await c.query('DELETE FROM password_resets WHERE user_id=$1',[user.id]);});await createSession(res,user);return json(res,200,{ok:true});
 }
 if(path==='/api/price-histogram'&&method==='GET')return json(res,200,await priceHistogram(query,url.searchParams));
 if(path==='/api/listings'&&method==='GET'){
 const s=search(url.searchParams);const total=(await query(`SELECT count(*)::integer AS count FROM listings l WHERE ${s.where}`,s.args)).rows[0].count;
 const rows=(await query(`SELECT ${projection} FROM listings l WHERE ${s.where} ORDER BY ${s.order} LIMIT 24 OFFSET $${s.args.length+1}`,[...s.args,(s.page-1)*24])).rows;return json(res,200,{listings:rows,total,page:s.page,pages:Math.ceil(total/24)});
 }
 if(path==='/api/listings'&&method==='POST'){
 requireUser(user);const approvedSalon=(await query("SELECT id FROM dealership_profiles WHERE owner_user_id=$1 AND status='approved'",[user.id])).rows.length>0;await rateLimit(`create:${user.id}`,approvedSalon?150:20,3600);const v=listingInput(await body(req));const id=randomUUID();let listingNumber;
 await transaction(async c=>{await c.query(`INSERT INTO listings(id,user_id,${columns.join(',')}) VALUES(${Array.from({length:columns.length+2},(_,i)=>'$'+(i+1)).join(',')})`,[id,user.id,...columns.map(k=>v[k])]);await imagesFor(c,user,id,v.imageIds,v.spinImageIds,v.category);listingNumber=(await c.query('SELECT listing_number FROM listings WHERE id=$1',[id])).rows[0].listing_number;});await adminEvent('listing',{id});return json(res,201,{id,listing_number:listingNumber,url:'/elan?id='+id,status:'pending'});
 }
 if(path==='/api/my-listings'&&method==='GET'){
 requireUser(user);return json(res,200,{listings:(await query(`SELECT ${projection} FROM listings l WHERE l.user_id=$1 AND NOT (l.details @> '{"_deleted":true}'::jsonb) ORDER BY l.created_at DESC`,[user.id])).rows});
 }
 const detail=path.match(/^\/api\/listings\/([a-f0-9-]+)$/);
 if(detail){
 const id=uuid(detail[1]);const l=(await query(`SELECT ${projection},u.fullname AS seller FROM listings l JOIN users u ON u.id=l.user_id WHERE l.id=$1`,[id])).rows[0];if(!l||l.details?._deleted)fail(404,'Elan tapılmadı.');
 const owner=user?.id===l.user_id;
 if(method==='GET'&&l.status==='active'){
  const salon=(await query("SELECT slug,display_name FROM dealership_profiles WHERE owner_user_id=$1 AND status='approved'",[l.user_id])).rows[0];
  if(salon)l.dealership={slug:salon.slug,name:salon.display_name};
 }
 if(method==='GET'){
 if(l.status!=='active'&&!owner&&user?.role!=='admin')fail(404,'Elan tapılmadı.');
 if(l.status==='active'&&!owner)await query('UPDATE listings SET views=views+1 WHERE id=$1',[id]);
 l.images=(await query('SELECT id,url FROM images WHERE listing_id=$1 AND sort_order<100 ORDER BY sort_order,id',[id])).rows;l.spin_frames=l.category==='car'?(await query('SELECT id,url FROM images WHERE listing_id=$1 AND sort_order>=100 ORDER BY sort_order,id LIMIT 36',[id])).rows:[];return json(res,200,{listing:l});
 }
 requireUser(user);if(!owner)fail(403,'Yalnız öz elanınızı dəyişə bilərsiniz.');
 if(method==='PUT'){
 const v=listingInput(await body(req));await transaction(async c=>{const previous=await lockListing(c,id,user);preservePublishedPrice(previous,v);if(await washLinks(c,id)){await requireNoReservations(c,id);if(v.category!=='wash')fail(409,'Rezervasiya sistemi qurulmuş avtoyumanın kateqoriyasını dəyişmək olmaz. Yeni kateqoriya üçün ayrıca elan yaradın.');}await c.query(`UPDATE listings SET ${columns.map((k,i)=>`${k}=$${i+1}`).join(',')},status='pending',rejection_reason='',updated_at=now() WHERE id=$${columns.length+1} AND user_id=$${columns.length+2}`,[...columns.map(k=>v[k]),id,user.id]);await imagesFor(c,user,id,v.imageIds,v.spinImageIds,v.category);});await adminEvent('listing',{id});return json(res,200,{ok:true,status:'pending'});
 }
 if(method==='PATCH'){
 const b=await body(req);if(!['sold','archived','pending'].includes(b.status))fail(400,'Status düzgün deyil.');await transaction(async c=>{const previous=await lockListing(c,id,user);if(previous.status==='active')await c.query("UPDATE listings SET details=details||jsonb_build_object('_publishedPrice',jsonb_build_object('price',price::text,'category',category)) WHERE id=$1",[id]);if(await washLinks(c,id))await requireNoReservations(c,id);await c.query('UPDATE listings SET status=$1,rejection_reason=\'\',updated_at=now() WHERE id=$2 AND user_id=$3',[b.status,id,user.id]);});if(b.status==='pending'&&l.status!=='pending')await adminEvent('listing',{id});return json(res,200,{ok:true});
 }
 if(method==='DELETE'){await transaction(c=>deleteListing(c,id,user));return json(res,200,{ok:true});}
 }
 if(path==='/api/favorites'&&method==='GET'){
 requireUser(user);return json(res,200,{listings:(await query(`SELECT ${projection} FROM listings l JOIN favorites f ON f.listing_id=l.id WHERE f.user_id=$1 AND l.status='active' ORDER BY f.created_at DESC`,[user.id])).rows});
 }
 const favorite=path.match(/^\/api\/favorites\/([a-f0-9-]+)$/);
 if(favorite&&['PUT','DELETE'].includes(method)){
 requireUser(user);const id=uuid(favorite[1]);if(method==='PUT'){
 const r=await query("INSERT INTO favorites(user_id,listing_id) SELECT $1,id FROM listings WHERE id=$2 AND status='active' ON CONFLICT DO NOTHING RETURNING listing_id",[user.id,id]);if(!r.rows.length && !(await query('SELECT 1 FROM favorites WHERE user_id=$1 AND listing_id=$2',[user.id,id])).rows.length)fail(404,'Elan tapılmadı.');
 }else await query('DELETE FROM favorites WHERE user_id=$1 AND listing_id=$2',[user.id,id]);return json(res,200,{ok:true});
 }
 if(path==='/api/spin-uploads'&&method==='POST'){requireUser(user);await rateLimit(`spin-uploads:${user.id}`,80,3600);return json(res,201,await upload(user,await body(req),{spin:true}));}
 if(path==='/api/uploads'&&method==='POST'){requireUser(user);await rateLimit(`uploads:${user.id}`,40,3600);return json(res,201,await upload(user,await body(req)));}
 if(path==='/api/notifications'&&method==='GET'){requireUser(user);return json(res,200,{notifications:(await query('SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100',[user.id])).rows});}
 if(path==='/api/notifications'&&method==='PATCH'){requireUser(user);await query('UPDATE notifications SET read_at=now() WHERE user_id=$1',[user.id]);return json(res,200,{ok:true});}
 if(path==='/api/reports'&&method==='POST'){
 requireUser(user);await rateLimit(`report:${user.id}`,10,3600);const b=await body(req);const id=uuid(b.listing_id);
 if(!(await query("SELECT id FROM listings WHERE id=$1 AND status='active'",[id])).rows.length)fail(404,'Elan tapılmadı.');
 await query('INSERT INTO reports(id,user_id,listing_id,reason) VALUES($1,$2,$3,$4)',[randomUUID(),user.id,id,text(b.reason,'Şikayət səbəbi',5,1000)]);return json(res,201,{ok:true});
 }
 if(path==='/api/map'&&method==='GET'){
 const s=search(url.searchParams);return json(res,200,{listings:(await query(`SELECT l.id,l.user_id,l.title,l.category,l.city,l.price,l.latitude,l.longitude,l.address,l.phone,l.details,l.created_at,(SELECT url FROM images WHERE listing_id=l.id ORDER BY sort_order LIMIT 1) AS image FROM listings l WHERE ${s.where} AND l.latitude IS NOT NULL AND l.longitude IS NOT NULL AND trim(l.address)<>'' AND (l.category IN ('service','wash','detailing') OR (l.category='parts' AND l.details->>'map_visible'='true')) ORDER BY l.created_at DESC LIMIT 500`,s.args)).rows});
 }
 if(path.startsWith('/api/admin/2fa/')){
  const result=await admin2fa(req,res,user,path,method);if(result)return json(res,200,result);
 }
 if(path.startsWith('/api/admin')){
 requireAdmin(user);
 if(path==='/api/admin/social-connection'&&method==='POST'){
  await rateLimit('social:check:'+user.id,4,3600);
  return json(res,200,await socialConnectionReport());
 }
 if(path==='/api/admin/social-publish'&&method==='POST'){
  const b=await body(req);const id=uuid(b.id);const platform=b.platform;
  if(!['instagram','facebook'].includes(platform))fail(400,'Sosial şəbəkə düzgün seçilməyib.');
  if(!socialShareEnabled()||!socialConfigured(platform))fail(503,'Meta paylaşım bağlantısı aktiv deyil.');
  await rateLimit('social:admin:'+user.id,12,3600);
  // One atomic claim per listing/platform. Unknown outcomes never unlock automatically.
  const locked=await query("UPDATE listings SET details=jsonb_set(details,'{social_shares}',COALESCE(details->'social_shares','{}'::jsonb)||jsonb_build_object($2::text,jsonb_build_object('status','publishing','started_at',now())),true) WHERE id=$1 AND status='active' AND NOT COALESCE((details->>'_deleted')::boolean,false) AND COALESCE(details#>>ARRAY['social_shares',$2,'status'],'')='' RETURNING id,title,brand,model,year,price,city,status",[id,platform]);
  if(!locked.rows.length)fail(409,'Elan aktiv deyil, artıq paylaşılıb və ya əvvəlki cəhdin nəticəsi yoxlanmalıdır.');
  try{
   const photo=await query('SELECT url FROM images WHERE listing_id=$1 ORDER BY sort_order,created_at LIMIT 1',[id]);
   const preview=socialSharePreview(locked.rows[0],photo.rows[0]?.url||'');
   const postId=await publishSocial(platform,preview,async containerId=>{
    await query("UPDATE listings SET details=jsonb_set(details,ARRAY['social_shares',$2],(details#>ARRAY['social_shares',$2])||jsonb_build_object('container_id',$3::text),true) WHERE id=$1",[id,platform,containerId]);
   });
   await transaction(async c=>{
    await c.query("UPDATE listings SET details=jsonb_set(details,ARRAY['social_shares',$2],(details#>ARRAY['social_shares',$2])||jsonb_build_object('status','sent','post_id',$3::text,'sent_at',now()),true) WHERE id=$1",[id,platform,postId]);
    await c.query('INSERT INTO audit_logs(id,admin_id,action,entity_id) VALUES($1,$2,$3,$4)',[randomUUID(),user.id,'social_'+platform,id]);
   });
   return json(res,200,{ok:true,platform,postId});
  }catch{
   await query("UPDATE listings SET details=jsonb_set(details,ARRAY['social_shares',$2],(details#>ARRAY['social_shares',$2])||jsonb_build_object('status','review_required','failed_at',now()),true) WHERE id=$1",[id,platform]);
   fail(502,'Paylaşımın nəticəsi yoxlanmalıdır. Təkrar postun qarşısını almaq üçün yeni cəhd bağlanıb. Meta hesabını yoxlayın.');
  }
 }
 if(path==='/api/admin/social-preview'&&method==='GET'){
  const id=uuid(url.searchParams.get('id'));
  const result=await query("SELECT l.id,l.title,l.brand,l.model,l.year,l.price,l.city,l.status,(SELECT i.url FROM images i WHERE i.listing_id=l.id ORDER BY i.sort_order,i.created_at LIMIT 1) AS image_url FROM listings l WHERE l.id=$1 AND NOT COALESCE((l.details->>'_deleted')::boolean,false)",[id]);
  if(!result.rows.length||result.rows[0].status!=='active')fail(404,'Yalnız təsdiqlənmiş elanı paylaşmaq olar.');
  return json(res,200,{preview:socialSharePreview(result.rows[0],result.rows[0].image_url||'')});
 }
 if(path==='/api/admin/social-permalink'&&method==='GET'){
  const id=uuid(url.searchParams.get('id'));
  const result=await query("SELECT details#>>'{social_shares,instagram,status}' AS status,details#>>'{social_shares,instagram,post_id}' AS post_id FROM listings WHERE id=$1",[id]);
  if(!result.rows.length||result.rows[0].status!=='sent'||!result.rows[0].post_id)fail(404,'Paylaşılmış Instagram postu tapılmadı.');
  return json(res,200,{url:await instagramPostPermalink(result.rows[0].post_id)});
 }
 if(path==='/api/admin/social-listings'&&method==='GET'){
  const rows=await query("SELECT l.id,l.title,l.brand,l.model,l.year,l.price,l.city,l.details->'social_shares' AS social_shares FROM listings l WHERE l.status='active' AND NOT COALESCE((l.details->>'_deleted')::boolean,false) ORDER BY l.updated_at DESC LIMIT 100");
  return json(res,200,{listings:rows.rows,enabled:socialShareEnabled(),configured:{instagram:socialConfigured('instagram'),facebook:socialConfigured('facebook')}});
 }
 if(path==='/api/admin/operations'&&method==='GET'){
  // Optional admin tables may not exist on production yet. Keep independent sections usable.
  const results=await Promise.allSettled([
   query("SELECT p.*,u.username,u.email FROM admin_business_profiles p JOIN users u ON u.id=p.user_id ORDER BY p.updated_at DESC LIMIT 100"),
   query("SELECT q.*,l.title FROM admin_social_queue q LEFT JOIN listings l ON l.id=q.listing_id ORDER BY q.created_at DESC LIMIT 100"),
   query("SELECT * FROM admin_android_releases ORDER BY created_at DESC LIMIT 50"),
   query("SELECT id,username,email FROM users WHERE role='user' ORDER BY created_at DESC LIMIT 100")
  ]);
  const rows=i=>results[i].status==='fulfilled'?results[i].value.rows:[];
  return json(res,200,{business:rows(0),social:rows(1),android:rows(2),users:rows(3),unavailable:results.map((r,i)=>r.status==='rejected'?['business','social','android','users'][i]:null).filter(Boolean)});
 }
 if(path==='/api/admin/operations'&&method==='POST'){
  const b=await body(req),kind=String(b.kind||'');let id=randomUUID();
  await transaction(async c=>{
   if(kind==='business'){
    const uid=uuid(b.user_id),name=String(b.name||'').trim(),type=String(b.business_type||'').trim(),status=String(b.status||'pending');if(!name||name.length>120||!type||type.length>80||!['pending','approved','rejected'].includes(status))fail(400,'Biznes məlumatları düzgün deyil.');const u=await c.query("SELECT id FROM users WHERE id=$1 AND role='user'",[uid]);if(!u.rows.length)fail(404,'İstifadəçi tapılmadı.');await c.query("INSERT INTO admin_business_profiles(user_id,business_name,business_type,status) VALUES($1,$2,$3,$4) ON CONFLICT(user_id) DO UPDATE SET business_name=$2,business_type=$3,status=$4,updated_at=now()",[uid,name,type,status]);id=uid;
   }else if(kind==='social'){
    const platform=String(b.platform||''),caption=String(b.caption||'').trim(),status=String(b.status||'draft');if(!['instagram','facebook'].includes(platform)||!caption||caption.length>2200||!['draft','ready'].includes(status))fail(400,'Paylaşım məlumatları düzgün deyil.');const lid=b.listing_id?uuid(b.listing_id):null;if(lid){const l=await c.query("SELECT id FROM listings WHERE id=$1 AND status='active'",[lid]);if(!l.rows.length)fail(400,'Yalnız aktiv elan seçilə bilər.');}await c.query("INSERT INTO admin_social_queue(id,listing_id,platform,caption,status) VALUES($1,$2,$3,$4,$5)",[id,lid,platform,caption,status]);
   }else if(kind==='android'){
    const name=String(b.version_name||'').trim(),code=Number(b.version_code),notes=String(b.release_notes||'').trim(),url=String(b.apk_url||'').trim(),channel=String(b.channel||'internal');if(!name||name.length>60||!Number.isSafeInteger(code)||code<1||!notes||notes.length>2000||!['internal','beta','production'].includes(channel)||url&&(!/^https:\/\//.test(url)||url.length>500))fail(400,'Versiya məlumatları düzgün deyil.');await c.query("INSERT INTO admin_android_releases(id,version_name,version_code,release_notes,apk_url,channel) VALUES($1,$2,$3,$4,$5,$6)",[id,name,code,notes,url||null,channel]);
   }else fail(400,'Naməlum əməliyyat.');
   await c.query('INSERT INTO audit_logs VALUES($1,$2,$3,$4,now())',[randomUUID(),user.id,'admin_'+kind,id]);
  });return json(res,201,{ok:true,id});
 }
 if(path==='/api/admin/finance'&&method==='GET'){
  const rows=await query("SELECT id,entry_date::text AS date,kind,category,description,amount_cents::text AS amount_cents,created_at FROM admin_finance_entries ORDER BY entry_date DESC,created_at DESC LIMIT 500");
  const totals=await query("SELECT coalesce(sum(amount_cents) FILTER(WHERE kind='income'),0)::text AS income_cents,coalesce(sum(amount_cents) FILTER(WHERE kind='expense'),0)::text AS expense_cents FROM admin_finance_entries");
  return json(res,200,{entries:rows.rows,totals:totals.rows[0]});
 }
 if(path==='/api/admin/finance'&&method==='POST'){
  const b=await body(req);const kind=String(b.kind||''),category=String(b.category||'').trim(),description=String(b.description||'').trim(),date=String(b.date||'');const amount=Number(b.amount);
  if(!['income','expense'].includes(kind)||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!category||category.length>90||description.length>500||!Number.isFinite(amount)||amount<=0||amount>100000000||Math.abs(Math.round(amount*100)-amount*100)>0.000001)fail(400,'Maliyyə məlumatları düzgün deyil.');
  const id=randomUUID();await transaction(async c=>{await c.query('INSERT INTO admin_finance_entries(id,entry_date,kind,category,description,amount_cents,created_by) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,date,kind,category,description,Math.round(amount*100),user.id]);await c.query('INSERT INTO audit_logs VALUES($1,$2,$3,$4,now())',[randomUUID(),user.id,'finance_add',id]);});return json(res,201,{ok:true,id});
 }
 if(path==='/api/admin/finance'&&method==='DELETE'){
  const b=await body(req);const id=uuid(b.id);await transaction(async c=>{const removed=await c.query('DELETE FROM admin_finance_entries WHERE id=$1 RETURNING id',[id]);if(!removed.rows.length)fail(404,'Maliyyə qeydi tapılmadı.');await c.query('INSERT INTO audit_logs VALUES($1,$2,$3,$4,now())',[randomUUID(),user.id,'finance_delete',id]);});return json(res,200,{ok:true});
 }
 if(path==='/api/admin/workspace'&&method==='GET'){
  const requests=[
   ["sos_requests","sos_requests"],["sos_masters","sos_masters"],
   ["wash_bookings","wash_bookings"],["wash_shops","wash_shops"]
  ];
  const results=await Promise.allSettled(requests.map(([table])=>query('SELECT count(*)::integer count FROM '+table)));
  const services=Object.fromEntries(requests.map(([,key],i)=>[key,results[i].status==='fulfilled'?results[i].value.rows[0].count:null]));
  return json(res,200,{services,unavailable:requests.filter((_,i)=>results[i].status==='rejected').map(([,key])=>key),serviceFlags:{sos:process.env.SOS_ENABLED==='true',wash:washEnabled()}});
 }
 if(path==='/api/admin/overview'&&method==='GET'){
  const [totals,statuses,categories,breakdown,growth,operations]=await Promise.all([
   query("SELECT count(*)::integer total,count(*) FILTER (WHERE created_at >= now()-interval '30 days')::integer last30,count(*) FILTER (WHERE created_at >= now()-interval '7 days')::integer last7 FROM listings"),
   query("SELECT status,count(*)::integer count FROM listings GROUP BY status ORDER BY status"),
   query("SELECT category,count(*)::integer count FROM listings GROUP BY category ORDER BY category"),
   query("SELECT category,status,count(*)::integer count FROM listings GROUP BY category,status ORDER BY category,status"),
   query(`SELECT to_char(created_at AT TIME ZONE 'Asia/Baku','YYYY-MM-DD') AS "day",count(*)::integer count FROM listings WHERE created_at >= now()-interval '30 days' GROUP BY 1 ORDER BY 1`),
   query(`SELECT (SELECT count(*)::integer FROM users) users_total,
   (SELECT count(*)::integer FROM users WHERE created_at>=now()-interval '7 days') users_last7,
   (SELECT count(*)::integer FROM users WHERE status='banned') users_banned,
   (SELECT count(*)::integer FROM reports WHERE status='open') reports_open,
   (SELECT count(*)::integer FROM listings WHERE status='pending') listings_pending,
   (SELECT count(*)::integer FROM listings WHERE category IN ('service','wash','detailing')) service_listings,
   (SELECT count(*)::integer FROM audit_logs WHERE created_at>=now()-interval '7 days') admin_actions_last7`)

  ]);
  return json(res,200,{...totals.rows[0],statuses:statuses.rows,categories:categories.rows,breakdown:breakdown.rows,growth:growth.rows,operations:operations.rows[0]});
 }
 if(path==='/api/admin'&&method==='GET'){
 const [stats,pending,reports,users,logs]=await Promise.all([
 query("SELECT count(*)::integer total,count(*) FILTER(WHERE status='active')::integer active,count(*) FILTER(WHERE status='pending')::integer pending FROM listings"),
 query(`SELECT ${projection} FROM listings l WHERE l.status='pending' ORDER BY l.created_at`),
 query("SELECT r.*,l.title FROM reports r JOIN listings l ON l.id=r.listing_id WHERE r.status='open' ORDER BY r.created_at DESC LIMIT 100"),
 query('SELECT id,fullname,email,role,status,created_at FROM users ORDER BY created_at DESC LIMIT 100'),query('SELECT a.*,u.fullname FROM audit_logs a JOIN users u ON u.id=a.admin_id ORDER BY a.created_at DESC LIMIT 100')]);
 return json(res,200,{stats:stats.rows[0],pending:pending.rows,reports:reports.rows,users:users.rows,logs:logs.rows});
 }
 if(path==='/api/admin/moderate'&&method==='POST'){
 const b=await body(req);const id=uuid(b.id);if(!['active','rejected'].includes(b.status))fail(400,'Status düzgün deyil.');const reason=b.status==='rejected'?text(b.reason,'Rədd səbəbi',5,1000):'';
 await transaction(async c=>{const locked=(await c.query("SELECT * FROM listings WHERE id=$1 FOR UPDATE",[id])).rows[0];if(!locked||locked.status!=='pending'||locked.details?._deleted)fail(409,'Elan artıq yoxlanılıb və ya tapılmadı.');if(b.status==='active')await publishPriceAlerts(c,locked);const r=await c.query("UPDATE listings SET status=$1,rejection_reason=$2,updated_at=now() WHERE id=$3 AND status='pending' RETURNING user_id,title",[b.status,reason,id]);if(!r.rows.length)fail(409,'Elan artıq yoxlanılıb və ya tapılmadı.');await notify(c,r.rows[0].user_id,b.status==='active'?`Elanınız təsdiqləndi: ${r.rows[0].title}`:`Elanınız rədd edildi: ${reason}`);await c.query('INSERT INTO audit_logs(id,admin_id,action,entity_id) VALUES($1,$2,$3,$4)',[randomUUID(),user.id,b.status,id]);});return json(res,200,{ok:true});
 }
 if(path==='/api/admin/user'&&method==='POST'){
 const b=await body(req);const id=uuid(b.id);if(!['active','banned'].includes(b.status)||id===user.id)fail(400,'Əməliyyat mümkün deyil.');
 await transaction(async c=>{const r=await c.query("UPDATE users SET status=$1 WHERE id=$2 AND role='user' RETURNING id",[b.status,id]);if(!r.rows.length)fail(403,'Bu hesab dəyişdirilə bilməz.');if(b.status==='banned'){await c.query('DELETE FROM sessions WHERE user_id=$1',[id]);await c.query("UPDATE listings SET status='archived' WHERE user_id=$1 AND status='active'",[id]);}await c.query('INSERT INTO audit_logs VALUES($1,$2,$3,$4,now())',[randomUUID(),user.id,b.status,id]);});return json(res,200,{ok:true});
 }
 if(path==='/api/admin/report'&&method==='POST'){
 const b=await body(req);const id=uuid(b.id);await transaction(async c=>{await c.query("UPDATE reports SET status='resolved' WHERE id=$1",[id]);await c.query('INSERT INTO audit_logs VALUES($1,$2,$3,$4,now())',[randomUUID(),user.id,'resolve_report',id]);});return json(res,200,{ok:true});
 }
 }
 if(path==='/api/assistant'&&method==='POST'){
 requireUser(user);if(!assistantConfig().enabled)fail(503,'AI köməkçisi hələ aktivləşdirilməyib. Axtarış filtrlərindən istifadə edə bilərsiniz.');
 const b=await body(req);const input=text(b.message,'Mesaj',3,1500);
 if(assistantConfig().provider==='gemini'&&b.consent!==true)fail(400,'Google Gemini üçün razılıq tələb olunur.');
 await rateLimit(`ai:${user.id}`,20,86400);await rateLimit('ai:global',200,86400);
 await rateLimit('ai:minute',5,60);
 return json(res,200,await assistantAnswer(input,{consent:b.consent}));
 }
 fail(404,'Səhifə tapılmadı.');
 }catch(e){
 const status=e instanceof HttpError?e.status:503;
 if(status===429)res.setHeader('Retry-After',String(e.retryAfter||60));
 if(!(e instanceof HttpError))console.error(JSON.stringify({event:'api_error',path:req.url?.split('?')[0],code:e.code||e.name}));
 json(res,status,{error:e instanceof HttpError?e.message:'Xidmət hazırda əlçatan deyil. Bir qədər sonra yenidən sınayın.'});
 }
}
