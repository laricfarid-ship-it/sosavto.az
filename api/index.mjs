import {randomUUID} from 'node:crypto';
import bcrypt from 'bcryptjs';
import {query,transaction} from '../server/db.mjs';
import {HttpError,fail,hash,safeUser,session,createSession,requireUser,requireAdmin,originCheck,rateLimit,body,text,uuid} from '../server/security.mjs';
import {listingInput,columns,projection,search} from '../server/listings.mjs';
import {upload} from '../server/uploads.mjs';
const json=(res,status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(data));};
async function imagesFor(c,user,id,ids){
 if(ids.length){const r=await c.query('SELECT id FROM images WHERE id=ANY($1::uuid[]) AND user_id=$2 AND (listing_id IS NULL OR listing_id=$3) FOR UPDATE',[ids,user.id,id]);if(r.rows.length!==ids.length)fail(400,'Şəkil seçimi düzgün deyil.');}
 await c.query('UPDATE images SET listing_id=NULL WHERE listing_id=$1',[id]);
 for(let i=0;i<ids.length;i++)await c.query('UPDATE images SET listing_id=$1,sort_order=$2 WHERE id=$3',[id,i,ids[i]]);
}
const notify=(c,user,body)=>c.query('INSERT INTO notifications(id,user_id,body) VALUES($1,$2,$3)',[randomUUID(),user,body]);
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 try{
 const url=new URL(req.url,'http://localhost'); const path=url.pathname.replace(/\/$/,'');const method=req.method;
 originCheck(req);
 if(path==='/api/config'&&method==='GET')return json(res,200,{ai:!!(process.env.OPENAI_API_KEY&&process.env.OPENAI_MODEL),uploads:!!(process.env.S3_BUCKET&&process.env.S3_PUBLIC_URL)||(process.env.LOCAL_DATABASE==='true'&&process.env.NODE_ENV!=='production'&&!process.env.VERCEL)});
 const user=await session(req);
 if(path==='/api/me'&&method==='GET')return json(res,200,{user:safeUser(user)});
 if(['/api/register','/api/login'].includes(path)&&method==='POST'){
 const b=await body(req);const identifier=text(b.identifier||b.email||'','Email və ya istifadəçi adı',3,200).toLowerCase();
 await rateLimit(`auth:${identifier}`,10,900);
 // Global database-backed throttle is shared across serverless instances; no spoofable client IP is trusted.
 await rateLimit('auth:global',1000,900);
 const password=text(b.password,'Şifrə',10,72);if(Buffer.byteLength(password)>72)fail(400,'Şifrə 72 baytdan uzun ola bilməz.');
 if(path==='/api/register'){
 const email=identifier;if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail(400,'Email ünvanını düzgün yazın.');
 const username=text(b.username,'İstifadəçi adı',3,30).toLowerCase();if(!/^[a-z0-9_]+$/.test(username))fail(400,'İstifadəçi adı üçün latın hərfləri, rəqəm və alt xətt istifadə edin.');
 const fullname=text(b.fullname,'Ad və soyad',2,100);const id=randomUUID();
 try{await query('INSERT INTO users(id,fullname,username,email,password_hash) VALUES($1,$2,$3,$4,$5)',[id,fullname,username,email,await bcrypt.hash(password,12)]);}catch(e){if(e.code==='23505')fail(409,'Bu email və ya istifadəçi adı artıq istifadə olunur.');throw e;}
 const u=(await query('SELECT * FROM users WHERE id=$1',[id])).rows[0];await createSession(res,u);return json(res,201,{user:safeUser(u)});
 }
 const u=(await query('SELECT * FROM users WHERE email=$1 OR username=$1',[identifier])).rows[0];
 const valid=await bcrypt.compare(password,u?.password_hash||'$2b$12$XU7.1nUi/iCTy4lYfsZnGO9DZdvNU91FdY56dLg47/O85VzVFhUUe');
 if(!u||!valid||u.status!=='active')fail(401,'Giriş məlumatları düzgün deyil.');await createSession(res,u);return json(res,200,{user:safeUser(u)});
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
 await transaction(async c=>{await c.query('UPDATE users SET password_hash=$1 WHERE id=$2',[await bcrypt.hash(password,12),user.id]);await c.query('DELETE FROM sessions WHERE user_id=$1',[user.id]);});await createSession(res,user);return json(res,200,{ok:true});
 }
 if(path==='/api/listings'&&method==='GET'){
 const s=search(url.searchParams);const total=(await query(`SELECT count(*)::integer AS count FROM listings l WHERE ${s.where}`,s.args)).rows[0].count;
 const rows=(await query(`SELECT ${projection} FROM listings l WHERE ${s.where} ORDER BY ${s.order} LIMIT 24 OFFSET $${s.args.length+1}`,[...s.args,(s.page-1)*24])).rows;return json(res,200,{listings:rows,total,page:s.page,pages:Math.ceil(total/24)});
 }
 if(path==='/api/listings'&&method==='POST'){
 requireUser(user);await rateLimit(`create:${user.id}`,20,3600);const v=listingInput(await body(req));const id=randomUUID();
 await transaction(async c=>{await c.query(`INSERT INTO listings(id,user_id,${columns.join(',')}) VALUES(${Array.from({length:columns.length+2},(_,i)=>'$'+(i+1)).join(',')})`,[id,user.id,...columns.map(k=>v[k])]);await imagesFor(c,user,id,v.imageIds);});return json(res,201,{id,status:'pending'});
 }
 if(path==='/api/my-listings'&&method==='GET'){
 requireUser(user);return json(res,200,{listings:(await query(`SELECT ${projection} FROM listings l WHERE l.user_id=$1 ORDER BY l.created_at DESC`,[user.id])).rows});
 }
 const detail=path.match(/^\/api\/listings\/([a-f0-9-]+)$/);
 if(detail){
 const id=uuid(detail[1]);const l=(await query(`SELECT ${projection},u.fullname AS seller FROM listings l JOIN users u ON u.id=l.user_id WHERE l.id=$1`,[id])).rows[0];if(!l)fail(404,'Elan tapılmadı.');
 const owner=user?.id===l.user_id;
 if(method==='GET'){
 if(l.status!=='active'&&!owner&&user?.role!=='admin')fail(404,'Elan tapılmadı.');
 if(l.status==='active'&&!owner)await query('UPDATE listings SET views=views+1 WHERE id=$1',[id]);
 l.images=(await query('SELECT id,url FROM images WHERE listing_id=$1 ORDER BY sort_order',[id])).rows;return json(res,200,{listing:l});
 }
 requireUser(user);if(!owner)fail(403,'Yalnız öz elanınızı dəyişə bilərsiniz.');
 if(method==='PUT'){
 const v=listingInput(await body(req));await transaction(async c=>{await c.query(`UPDATE listings SET ${columns.map((k,i)=>`${k}=$${i+1}`).join(',')},status='pending',rejection_reason='',updated_at=now() WHERE id=$${columns.length+1} AND user_id=$${columns.length+2}`,[...columns.map(k=>v[k]),id,user.id]);await imagesFor(c,user,id,v.imageIds);});return json(res,200,{ok:true,status:'pending'});
 }
 if(method==='PATCH'){
 const b=await body(req);if(!['sold','archived','pending'].includes(b.status))fail(400,'Status düzgün deyil.');await query('UPDATE listings SET status=$1,rejection_reason=\'\',updated_at=now() WHERE id=$2 AND user_id=$3',[b.status,id,user.id]);return json(res,200,{ok:true});
 }
 if(method==='DELETE'){await query('DELETE FROM listings WHERE id=$1 AND user_id=$2',[id,user.id]);return json(res,200,{ok:true});}
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
 if(path==='/api/uploads'&&method==='POST'){requireUser(user);await rateLimit(`uploads:${user.id}`,40,3600);return json(res,201,await upload(user,await body(req)));}
 if(path==='/api/notifications'&&method==='GET'){requireUser(user);return json(res,200,{notifications:(await query('SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100',[user.id])).rows});}
 if(path==='/api/notifications'&&method==='PATCH'){requireUser(user);await query('UPDATE notifications SET read_at=now() WHERE user_id=$1',[user.id]);return json(res,200,{ok:true});}
 if(path==='/api/reports'&&method==='POST'){
 requireUser(user);await rateLimit(`report:${user.id}`,10,3600);const b=await body(req);const id=uuid(b.listing_id);
 if(!(await query("SELECT id FROM listings WHERE id=$1 AND status='active'",[id])).rows.length)fail(404,'Elan tapılmadı.');
 await query('INSERT INTO reports(id,user_id,listing_id,reason) VALUES($1,$2,$3,$4)',[randomUUID(),user.id,id,text(b.reason,'Şikayət səbəbi',5,1000)]);return json(res,201,{ok:true});
 }
 if(path==='/api/map'&&method==='GET'){
 const s=search(url.searchParams);return json(res,200,{listings:(await query(`SELECT l.id,l.title,l.category,l.city,l.price,l.latitude,l.longitude FROM listings l WHERE ${s.where} AND l.latitude IS NOT NULL ORDER BY l.created_at DESC LIMIT 500`,s.args)).rows});
 }
 if(path.startsWith('/api/admin')){
 requireAdmin(user);
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
 await transaction(async c=>{const r=await c.query("UPDATE listings SET status=$1,rejection_reason=$2,updated_at=now() WHERE id=$3 AND status='pending' RETURNING user_id,title",[b.status,reason,id]);if(!r.rows.length)fail(409,'Elan artıq yoxlanılıb və ya tapılmadı.');await notify(c,r.rows[0].user_id,b.status==='active'?`Elanınız təsdiqləndi: ${r.rows[0].title}`:`Elanınız rədd edildi: ${reason}`);await c.query('INSERT INTO audit_logs(id,admin_id,action,entity_id) VALUES($1,$2,$3,$4)',[randomUUID(),user.id,b.status,id]);});return json(res,200,{ok:true});
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
 requireUser(user);if(!process.env.OPENAI_API_KEY||!process.env.OPENAI_MODEL)fail(503,'AI köməkçisi hələ aktivləşdirilməyib. Axtarış filtrlərindən istifadə edə bilərsiniz.');
 await rateLimit(`ai:${user.id}`,20,86400);await rateLimit('ai:global',200,86400);
 const b=await body(req);const input=text(b.message,'Mesaj',3,1500);const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(20000),body:JSON.stringify({model:process.env.OPENAI_MODEL,store:false,max_output_tokens:700,instructions:'Sən SosAvto.az Azərbaycan avtomobil platformasının köməkçisisən. Azərbaycan dilində qısa cavab ver. Yalnız avtomobil, ehtiyat hissələri və xidmətlər barədə kömək et. Real elanlara, qiymət bazasına və hesablara çıxışın yoxdur; bunları uydurma. İstifadəçi verdiyi faktlarla elan təsviri hazırlaya bilərsən, məlum olmayan vəziyyət və xüsusiyyətləri uydurma. Təcili mexaniki təhlükədə peşəkar servisi tövsiyə et. Heç bir əməliyyat etdiyini demə.',input})});
 if(!response.ok)fail(502,'AI xidməti hazırda cavab vermir. Sonra yenidən sınayın.');const data=await response.json();const answer=(data.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('\n');if(!answer)fail(502,'Cavab alınmadı.');return json(res,200,{answer});
 }
 fail(404,'Səhifə tapılmadı.');
 }catch(e){
 const status=e instanceof HttpError?e.status:503;
 if(!(e instanceof HttpError))console.error(JSON.stringify({event:'api_error',path:req.url?.split('?')[0],code:e.code||e.name}));
 json(res,status,{error:e instanceof HttpError?e.message:'Xidmət hazırda əlçatan deyil. Bir qədər sonra yenidən sınayın.'});
 }
}
