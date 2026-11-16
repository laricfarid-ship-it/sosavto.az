import {randomUUID} from 'node:crypto';
import {query} from './db.mjs';
import {body,fail,requireUser,rateLimit,text,uuid} from './security.mjs';
const access=(c,u)=>c.buyer_id===u.id||c.seller_id===u.id||(c.kind==='support'&&u.role==='admin');
export async function messages(req,user,path,method,url){
 requireUser(user);
 if(path==='/api/conversations'&&method==='POST'){
  await rateLimit('conversation:'+user.id,30,3600);const b=await body(req);let seller=null,listing=null;
  if(b.kind!=='support'){
   listing=uuid(b.listing_id);const l=(await query("SELECT user_id FROM listings WHERE id=$1 AND status='active'",[listing])).rows[0];
   if(!l)fail(404,'Elan tapılmadı.');seller=l.user_id;if(seller===user.id)fail(400,'Öz elanınıza mesaj göndərə bilməzsiniz.');
   if(!(await query("SELECT id FROM users WHERE id=$1 AND status='active'",[seller])).rows.length)fail(404,'Elan sahibi əlçatan deyil.');
  }
  const kind=listing?'listing':'support';
  const r=await query(`INSERT INTO conversations(id,kind,buyer_id,seller_id,listing_id) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING RETURNING id`,[randomUUID(),kind,user.id,seller,listing]);
  const c=r.rows[0]||(await query('SELECT id FROM conversations WHERE buyer_id=$1 AND kind=$2 AND (listing_id=$3 OR $3 IS NULL)',[user.id,kind,listing])).rows[0];return {conversation:c};
 }
 if(path==='/api/conversations'&&method==='GET'){
  const r=await query(`SELECT c.id,c.kind,c.listing_id,c.created_at,l.title,l.listing_number,
   CASE WHEN c.kind='support' AND c.buyer_id=$1 THEN 'SosAvto dəstək' WHEN c.buyer_id=$1 THEN s.fullname ELSE b.fullname END AS name,
   m.body AS last_message,COALESCE(m.created_at,c.created_at) AS updated_at
   FROM conversations c JOIN users b ON b.id=c.buyer_id LEFT JOIN users s ON s.id=c.seller_id LEFT JOIN listings l ON l.id=c.listing_id
   LEFT JOIN LATERAL (SELECT body,created_at FROM conversation_messages WHERE conversation_id=c.id ORDER BY created_at DESC,id DESC LIMIT 1) m ON true
   WHERE c.buyer_id=$1 OR c.seller_id=$1 OR (c.kind='support' AND $2='admin') ORDER BY updated_at DESC,c.id LIMIT 200`,[user.id,user.role]);return {conversations:r.rows};
 }
 const match=path.match(/^\/api\/conversations\/([^/]+)\/messages$/);
 if(match){
  const id=uuid(match[1]);const c=(await query('SELECT * FROM conversations WHERE id=$1',[id])).rows[0];
  if(!c||!access(c,user))fail(404,'Yazışma tapılmadı.');
  if(method==='GET'){
   const before=url.searchParams.get('before');const beforeId=url.searchParams.get('before_id');if(before){if(!Number.isFinite(Date.parse(before)))fail(400,'Yanlış tarix.');uuid(beforeId);}
   const rows=(await query(`SELECT id,sender_id,body,created_at::text AS created_at FROM conversation_messages WHERE conversation_id=$1 ${before?'AND (created_at,id)<($2::timestamptz,$3::uuid)':''} ORDER BY created_at DESC,id DESC LIMIT 51`,before?[id,before,beforeId]:[id])).rows;
   return {messages:rows.slice(0,50).reverse(),hasMore:rows.length>50};
  }
  if(method==='POST'){
   await rateLimit('message:'+user.id,30,60);const b=await body(req);const value=text(b.message,'Mesaj',1,2000);
   const row=(await query('INSERT INTO conversation_messages(id,conversation_id,sender_id,body) VALUES($1,$2,$3,$4) RETURNING id,sender_id,body,created_at::text AS created_at',[randomUUID(),id,user.id,value])).rows[0];return {message:row};
  }
 }
 fail(404,'Səhifə tapılmadı.');
}
