import {randomUUID} from 'node:crypto';
import {query,transaction} from './db.mjs';
import {fail,requireUser,requireAdmin,body,text,number,uuid,rateLimit} from './security.mjs';
const problems=['tire','battery','fuel','engine','accident','other'];
const active=['searching','offered','en_route','arrived'];
const phone=v=>{const p=text(v,'Telefon',9,25);if(!/^\+?[\d ()-]{9,25}$/.test(p)||p.replace(/\D/g,'').length<9)fail(400,'Telefon düzgün deyil.');return p;};
const coords=b=>[number(b.latitude,'Enlik',-90,90),number(b.longitude,'Uzunluq',-180,180)];
const distance=(a,b,c,d)=>6371*2*Math.asin(Math.sqrt(Math.min(1,Math.sin((c-a)*Math.PI/360)**2+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin((d-b)*Math.PI/360)**2)));
async function event(c,id,actor,status){await c.query('INSERT INTO sos_events(id,request_id,actor_id,status) VALUES($1,$2,$3,$4)',[randomUUID(),id,actor,status]);}
async function notify(c,user,message){await c.query('INSERT INTO notifications(id,user_id,body) VALUES($1,$2,$3)',[randomUUID(),user,message]);}
async function expire(c){
 const stale=(await c.query("UPDATE sos_requests SET status='expired',updated_at=now() WHERE status IN ('searching','offered') AND expires_at<=now() RETURNING id,driver_id,master_id")).rows;
 for(const r of stale){await c.query("UPDATE sos_dispatches SET status='closed' WHERE request_id=$1 AND status IN ('pending','accepted')",[r.id]);await event(c,r.id,null,'expired');}
}
async function dispatch(c,r){
 const candidates=(await c.query(`SELECT m.* FROM sos_masters m JOIN users u ON u.id=m.user_id
 WHERE m.approval='approved' AND m.online AND m.location_at>now()-interval '90 seconds' AND u.status='active'
 AND m.user_id<>$1 AND $2=ANY(m.specialties)
 AND NOT EXISTS(SELECT 1 FROM sos_requests s WHERE s.master_id=m.user_id AND s.status IN ('offered','en_route','arrived'))`,[r.driver_id,r.problem])).rows;
 const near=candidates.map(m=>({...m,km:distance(r.latitude,r.longitude,m.latitude,m.longitude)})).filter(m=>m.km<=8).sort((a,b)=>a.km-b.km).slice(0,10);
 for(const m of near)await c.query('INSERT INTO sos_dispatches(request_id,master_id,distance_km) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[r.id,m.user_id,m.km]);
}
async function requestView(c,r,user){
 const mine=r.driver_id===user.id,assigned=r.master_id===user.id;
 if(!mine&&!assigned)fail(404,'Çağırış tapılmadı.');
 const result={...r};delete result.client_key;
 if(r.master_id){const m=(await c.query(`SELECT u.fullname,m.phone,m.latitude,m.longitude,m.location_at,m.online,(SELECT round(avg(v.rating),1) FROM sos_reviews v JOIN sos_requests s ON s.id=v.request_id WHERE s.master_id=m.user_id) AS rating,
 (SELECT count(*)::int FROM sos_reviews v JOIN sos_requests s ON s.id=v.request_id WHERE s.master_id=m.user_id) AS review_count FROM sos_masters m JOIN users u ON u.id=m.user_id WHERE m.user_id=$1`,[r.master_id])).rows[0];
 result.master={fullname:m.fullname,phone:m.phone,rating:m.rating,review_count:m.review_count};if(!r.confirmed_at)delete result.master.phone;
 if(mine&&['en_route','arrived'].includes(r.status)&&m.online&&m.location_at&&Date.now()-new Date(m.location_at).getTime()<90000)result.master.location={latitude:m.latitude,longitude:m.longitude,updated_at:m.location_at};
 }
 if(assigned&&!r.confirmed_at){delete result.phone;delete result.latitude;delete result.longitude;delete result.address;}
 result.events=(await c.query('SELECT status,created_at FROM sos_events WHERE request_id=$1 ORDER BY created_at',[r.id])).rows;
 result.review=(await c.query('SELECT rating,comment FROM sos_reviews WHERE request_id=$1',[r.id])).rows[0]||null;
 return result;
}
export async function sos(req,user,path,method){
 if(process.env.SOS_ENABLED!=='true')fail(404,'SOS xidməti hələ aktiv deyil.');
 requireUser(user);
 if(method!=='GET')await rateLimit(`sos:${user.id}`,120,60);
 await transaction(expire);
 if(path==='/api/sos/master'&&method==='GET')return {master:(await query("SELECT *,online AND location_at>now()-interval '90 seconds' AS available FROM sos_masters WHERE user_id=$1",[user.id])).rows[0]||null};
 if(path==='/api/sos/master'&&method==='POST'){
 const b=await body(req);const p=phone(b.phone);if(!Array.isArray(b.specialties)||!b.specialties.length||b.specialties.some(v=>!problems.includes(v)))fail(400,'Ən azı bir ixtisas seçin.');
 await transaction(async c=>{
 await c.query('SELECT user_id FROM sos_masters WHERE user_id=$1 FOR UPDATE',[user.id]);
 if((await c.query("SELECT id FROM sos_requests WHERE master_id=$1 AND status IN ('offered','en_route','arrived')",[user.id])).rows.length)fail(409,'Əvvəl aktiv sifarişi tamamlayın.');
 await c.query(`INSERT INTO sos_masters(user_id,phone,specialties) VALUES($1,$2,$3) ON CONFLICT(user_id) DO UPDATE SET phone=$2,specialties=$3,approval='pending',online=false`,[user.id,p,[...new Set(b.specialties)]]);
 });return {ok:true};
 }
 if(path==='/api/sos/presence'&&method==='POST'){
 const b=await body(req);if(typeof b.online!=='boolean')fail(400,'Aktivlik düzgün deyil.');const [lat,lng]=b.online?coords(b):[null,null];
 const r=await query(`UPDATE sos_masters SET online=$1,latitude=CASE WHEN $1 THEN $2 ELSE latitude END,longitude=CASE WHEN $1 THEN $3 ELSE longitude END,location_at=CASE WHEN $1 THEN now() ELSE location_at END WHERE user_id=$4 AND approval='approved' RETURNING user_id`,[b.online,lat,lng,user.id]);
 if(!r.rows.length)fail(403,'Usta hesabı idarəçi tərəfindən təsdiqlənməlidir.');
 // Newly-online specialists also receive still-open requests; all work stays server-side.
 if(b.online)await transaction(async c=>{const rows=(await c.query("SELECT * FROM sos_requests WHERE status='searching' AND expires_at>now() ORDER BY created_at LIMIT 100")).rows;for(const r of rows)await dispatch(c,r);});
 return {ok:true};
 }
 if(path==='/api/sos/requests'&&method==='POST'){
 const b=await body(req),key=uuid(b.client_key),[lat,lng]=coords(b);if(!problems.includes(b.problem))fail(400,'Problem növünü seçin.');
 const p=phone(b.phone),address=text(b.address,'Ünvan',3,300),note=text(b.note||'','Qeyd',0,1000);
 await rateLimit(`sos:create:${user.id}`,10,3600);
 return transaction(async c=>{
 await c.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[user.id]);
 const prior=(await c.query('SELECT * FROM sos_requests WHERE driver_id=$1 AND client_key=$2',[user.id,key])).rows[0];if(prior)return {request:await requestView(c,prior,user)};
 if((await c.query("SELECT id FROM sos_requests WHERE (driver_id=$1 AND status IN ('searching','offered','en_route','arrived')) OR (master_id=$1 AND status IN ('offered','en_route','arrived'))",[user.id])).rows.length)fail(409,'Artıq aktiv çağırışınız var.');
 const r=(await c.query('INSERT INTO sos_requests(id,driver_id,client_key,problem,latitude,longitude,address,note,phone) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',[randomUUID(),user.id,key,b.problem,lat,lng,address,note,p])).rows[0];await event(c,r.id,user.id,'searching');await dispatch(c,r);return {request:await requestView(c,r,user)};
 });
 }
 if(path==='/api/sos/requests'&&method==='GET')return transaction(async c=>{const rows=(await c.query('SELECT * FROM sos_requests WHERE driver_id=$1 OR master_id=$1 ORDER BY created_at DESC LIMIT 50',[user.id])).rows;return {requests:await Promise.all(rows.map(r=>requestView(c,r,user)))};});
 if(path==='/api/sos/inbox'&&method==='GET')return {dispatches:(await query(`SELECT r.id,r.problem,r.note,d.distance_km,r.expires_at FROM sos_dispatches d JOIN sos_requests r ON r.id=d.request_id JOIN sos_masters m ON m.user_id=d.master_id
 WHERE d.master_id=$1 AND d.status='pending' AND r.status='searching' AND r.expires_at>now() AND m.approval='approved' AND m.online AND m.location_at>now()-interval '90 seconds' ORDER BY r.created_at LIMIT 30`,[user.id])).rows};
 if(path==='/api/sos/admin/masters'&&method==='GET'){requireAdmin(user);return {masters:(await query('SELECT m.*,u.fullname FROM sos_masters m JOIN users u ON u.id=m.user_id ORDER BY m.created_at DESC LIMIT 200')).rows};}
 if(path==='/api/sos/admin/masters'&&method==='POST'){
 requireAdmin(user);const b=await body(req),id=uuid(b.id);if(!['approved','rejected'].includes(b.approval))fail(400,'Status düzgün deyil.');
 await transaction(async c=>{const r=await c.query('UPDATE sos_masters SET approval=$1,online=false WHERE user_id=$2 RETURNING user_id',[b.approval,id]);if(!r.rows.length)fail(404,'Usta tapılmadı.');await c.query('INSERT INTO audit_logs(id,admin_id,action,entity_id) VALUES($1,$2,$3,$4)',[randomUUID(),user.id,'sos_master_'+b.approval,id]);await notify(c,id,b.approval==='approved'?'SOS usta hesabınız təsdiqləndi.':'SOS usta müraciətiniz rədd edildi.');});return {ok:true};
 }
 const match=path.match(/^\/api\/sos\/requests\/([a-f0-9-]+)(?:\/(accept|decline|confirm|arrive|complete|cancel|review))?$/);
 if(!match)fail(404,'Səhifə tapılmadı.');const id=uuid(match[1]),action=match[2];
 if(method==='GET'&&!action)return transaction(async c=>{const r=(await c.query('SELECT * FROM sos_requests WHERE id=$1',[id])).rows[0];if(!r)fail(404,'Çağırış tapılmadı.');return {request:await requestView(c,r,user)};});
 if(method!=='POST'||!action)fail(405,'Əməliyyat dəstəklənmir.');const b=await body(req);
 try{return await transaction(async c=>{
 const r=(await c.query('SELECT * FROM sos_requests WHERE id=$1 FOR UPDATE',[id])).rows[0];if(!r)fail(404,'Çağırış tapılmadı.');
 const mine=r.driver_id===user.id,assigned=r.master_id===user.id;
 if(['accept','decline'].includes(action)){
 const d=(await c.query('SELECT * FROM sos_dispatches WHERE request_id=$1 AND master_id=$2',[id,user.id])).rows[0];if(!d)fail(404,'Çağırış tapılmadı.');
 if(action==='accept'&&assigned&&r.status==='offered')return {request:await requestView(c,r,user)};
 if(r.status!=='searching'||d.status!=='pending')fail(409,'Çağırış artıq əlçatan deyil.');
 if(action==='decline'){await c.query("UPDATE sos_dispatches SET status='declined' WHERE request_id=$1 AND master_id=$2",[id,user.id]);return {ok:true};}
 // Serialize the account across both driver creation and master acceptance.
 await c.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[user.id]);
 // Lock the master as well as the request: a master cannot accept two jobs concurrently.
 const m=(await c.query("SELECT * FROM sos_masters WHERE user_id=$1 AND approval='approved' AND online AND location_at>now()-interval '90 seconds' FOR UPDATE",[user.id])).rows[0];if(!m||!m.specialties.includes(r.problem)||distance(r.latitude,r.longitude,m.latitude,m.longitude)>8)fail(409,'Əvvəl aktivliyinizi və məkanınızı yeniləyin.');
 if((await c.query("SELECT id FROM sos_requests WHERE (master_id=$1 AND status IN ('offered','en_route','arrived')) OR (driver_id=$1 AND status IN ('searching','offered','en_route','arrived'))",[user.id])).rows.length)fail(409,'Artıq aktiv sifarişiniz var.');
 const fees=['arrival_fee','labor_fee','parts_fee'].map(k=>number(b[k],'Qiymət',0,10000));const eta=number(b.eta_minutes,'Çatma vaxtı',1,240);if(!Number.isInteger(eta))fail(400,'Vaxtı dəqiqə ilə tam ədəd yazın.');
 await c.query("UPDATE sos_requests SET status='offered',master_id=$2,arrival_fee=$3,labor_fee=$4,parts_fee=$5,eta_minutes=$6,expires_at=now()+interval '5 minutes',updated_at=now() WHERE id=$1",[id,user.id,...fees,eta]);
 await c.query("UPDATE sos_dispatches SET status=CASE WHEN master_id=$2 THEN 'accepted' ELSE 'closed' END WHERE request_id=$1 AND status='pending'",[id,user.id]);await event(c,id,user.id,'offered');await notify(c,r.driver_id,'SOS çağırışınıza qiymət təklifi gəldi. Yol yardımı səhifəsində təsdiqləyin.');
 }else{
 if(!mine&&!assigned)fail(404,'Çağırış tapılmadı.');
 if(action==='review'){
 if(!mine||r.status!=='completed')fail(409,'Yalnız tamamlanmış öz sifarişinizi qiymətləndirə bilərsiniz.');const rating=number(b.rating,'Qiymətləndirmə',1,5);if(!Number.isInteger(rating))fail(400,'Tam ədəd seçin.');
 await c.query('INSERT INTO sos_reviews(request_id,rating,comment) VALUES($1,$2,$3) ON CONFLICT(request_id) DO NOTHING',[id,rating,text(b.comment||'','Rəy',0,500)]);return {ok:true};
 }
 const rules={confirm:[mine,'offered','en_route'],arrive:[assigned,'en_route','arrived'],complete:[mine,'arrived','completed']};
 let next;
 if(action==='cancel'){
 if(!active.includes(r.status))fail(409,'Bu sifariş artıq bağlanıb.');next='cancelled';await c.query('UPDATE sos_requests SET cancellation_reason=$2 WHERE id=$1',[id,text(b.reason,'Ləğv səbəbi',3,300)]);
 }else{const rule=rules[action];if(!rule||!rule[0])fail(403,'Bu əməliyyat üçün icazəniz yoxdur.');if(r.status!==rule[1])fail(409,'Sifarişin statusu dəyişib. Səhifəni yeniləyin.');next=rule[2];}
 await c.query("UPDATE sos_requests SET status=$2,confirmed_at=CASE WHEN $2='en_route' THEN now() ELSE confirmed_at END,updated_at=now() WHERE id=$1",[id,next]);if(['cancelled','completed'].includes(next))await c.query("UPDATE sos_dispatches SET status='closed' WHERE request_id=$1 AND status IN ('pending','accepted')",[id]);await event(c,id,user.id,next);
 const recipient=mine?r.master_id:r.driver_id;if(recipient)await notify(c,recipient,'SOS sifarişinizin statusu yeniləndi. Yol yardımı səhifəsinə baxın.');
 }
 return {request:await requestView(c,(await c.query('SELECT * FROM sos_requests WHERE id=$1',[id])).rows[0],user)};
 });}catch(e){if(e.code==='23505')fail(409,'Bu çağırış və ya usta artıq məşğuldur.');throw e;}
}
