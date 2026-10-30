import webpush from 'web-push';
import {ECDH,randomUUID} from 'node:crypto';
import {query,transaction} from './db.mjs';
import {body,fail,requireAdmin,rateLimit} from './security.mjs';

export const pushEnabled=()=>!!(process.env.PUSH_VAPID_PUBLIC_KEY&&process.env.PUSH_VAPID_PRIVATE_KEY);
export function validateSubscription(value){
 let url;try{url=new URL(value?.endpoint);}catch{fail(400,'Bildiriş ünvanı düzgün deyil.');}
 // Never send HTTP requests to client-selected internal or arbitrary hosts.
 const allowed=url.hostname==='fcm.googleapis.com'||url.hostname==='updates.push.services.mozilla.com'||url.hostname.endsWith('.push.services.mozilla.com')||url.hostname==='web.push.apple.com'||url.hostname.endsWith('.push.apple.com');
 if(!allowed||url.protocol!=='https:'||url.port||url.username||url.password||url.hash||url.href.length>2048)fail(400,'Bildiriş xidməti dəstəklənmir.');
 const keys=value?.keys;
 if(!keys||!/^[-_A-Za-z0-9]{87}$/.test(keys.p256dh)||!/^[-_A-Za-z0-9]{22}$/.test(keys.auth))fail(400,'Bildiriş açarları düzgün deyil.');
 try{ECDH.convertKey(Buffer.from(keys.p256dh,'base64url'),'prime256v1');}catch{fail(400,'Bildiriş açarı düzgün deyil.');}
 return {endpoint:url.href,keys:{p256dh:keys.p256dh,auth:keys.auth}};
}
export async function deliverPush(rows,payload,send=webpush.sendNotification.bind(webpush)){
 const results=await Promise.all(rows.map(async row=>{
  try{await send(row.subscription,JSON.stringify(payload),{TTL:86400,urgency:'high',timeout:4000,vapidDetails:{subject:'https://sosavto.az',publicKey:process.env.PUSH_VAPID_PUBLIC_KEY,privateKey:process.env.PUSH_VAPID_PRIVATE_KEY}});return true;}
  catch(e){if([404,410].includes(e.statusCode))await query('DELETE FROM admin_push_subscriptions WHERE endpoint=$1 AND subscription=$2::jsonb',[row.endpoint,JSON.stringify(row.subscription)]);console.warn(JSON.stringify({event:'admin_push_delivery_failed',code:e.statusCode||e.code||e.name}));return false;}
 }));
 return {sent:results.filter(Boolean).length,failed:results.filter(x=>!x).length};
}
export async function adminEvent(kind,{id,name=''}){
 // A notification failure must not roll back a successful registration/login/listing.
 try{
  const labels={listing:'Yeni elan yoxlanış gözləyir',register:'Yeni istifadəçi qeydiyyatdan keçdi',login:'İstifadəçi hesabına daxil oldu'};
  const title=labels[kind];if(!title)return;
  const message=kind==='listing'?'Elanı yoxlamaq və təsdiqləmək üçün toxunun.':name.slice(0,100);
  await query("INSERT INTO notifications(id,user_id,body) SELECT gen_random_uuid(),id,$1 FROM users WHERE role='admin' AND status='active'",[`${title}${message?' — '+message:''}`]);
  if(!pushEnabled())return;
  const rows=(await query("SELECT p.* FROM admin_push_subscriptions p JOIN users u ON u.id=p.user_id WHERE u.role='admin' AND u.status='active'")).rows;
  // Bound concurrent outbound work; admins normally have one or two phones.
  const payload={title,body:message,url:kind==='listing'?`/admin.html?listing=${id}`:'/admin.html',tag:randomUUID()};
  for(let i=0;i<rows.length;i+=20)await deliverPush(rows.slice(i,i+20),payload);
 }catch(e){console.warn(JSON.stringify({event:'admin_notification_failed',code:e.code||e.name}));}
}
export async function pushApi(req,user,method){
 requireAdmin(user);
 if(method==='GET')return {enabled:pushEnabled(),publicKey:pushEnabled()?process.env.PUSH_VAPID_PUBLIC_KEY:null};
 if(!pushEnabled())fail(503,'Telefon bildirişləri hələ aktivləşdirilməyib.');
 const b=await body(req);
 if(method==='POST'){
  await rateLimit(`push-subscribe:${user.id}`,30,3600);
  const sub=validateSubscription(b.subscription);
  await transaction(async c=>{
   await c.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[user.id]);
   const existing=(await c.query('SELECT user_id FROM admin_push_subscriptions WHERE endpoint=$1',[sub.endpoint])).rows[0];
   if(existing&&existing.user_id!==user.id)fail(409,'Bu cihaz başqa admin hesabına bağlıdır. Əvvəl həmin hesabdan bildirişləri söndürün.');
   if(!existing&&(await c.query('SELECT count(*)::integer AS n FROM admin_push_subscriptions WHERE user_id=$1',[user.id])).rows[0].n>=10)fail(409,'Maksimum 10 cihaz qoşmaq olar.');
   await c.query('INSERT INTO admin_push_subscriptions(endpoint,user_id,subscription) VALUES($1,$2,$3) ON CONFLICT(endpoint) DO UPDATE SET subscription=EXCLUDED.subscription,updated_at=now() WHERE admin_push_subscriptions.user_id=EXCLUDED.user_id',[sub.endpoint,user.id,JSON.stringify(sub)]);
  });return {ok:true};
 }
 if(method==='DELETE'){
  if(typeof b.endpoint!=='string')fail(400,'Cihaz ünvanı tələb olunur.');
  await query('DELETE FROM admin_push_subscriptions WHERE endpoint=$1 AND user_id=$2',[b.endpoint,user.id]);return {ok:true};
 }
 if(method==='PUT'){
  await rateLimit(`push-test:${user.id}`,5,300);
  const rows=(await query('SELECT * FROM admin_push_subscriptions WHERE user_id=$1 AND endpoint=$2',[user.id,typeof b.endpoint==='string'?b.endpoint:''])).rows;
  if(!rows.length)fail(409,'Əvvəl bu cihazda bildirişləri aktiv edin.');
  const result=await deliverPush(rows,{title:'SosAvto — sınaq bildirişi',body:'Telefon bildirişləri işləyir. Yeni elanları buradan yoxlaya bilərsiniz.',url:'/admin.html',tag:randomUUID()});
  if(!result.sent)fail(503,'Sınaq bildirişi göndərilmədi. Bildirişləri yenidən aktiv edin.');
  return {ok:true,...result};
 }
 fail(405,'Əməliyyat dəstəklənmir.');
}
