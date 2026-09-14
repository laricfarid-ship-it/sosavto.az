import {randomBytes} from 'node:crypto';
import bcrypt from 'bcryptjs';
import {query,transaction} from './db.mjs';
import {fail,hash,text,rateLimit} from './security.mjs';

export const resetEnabled=()=>!!(process.env.RESEND_API_KEY&&process.env.EMAIL_FROM&&process.env.APP_ORIGIN);
const generic='Bu email ilə aktiv hesab varsa, şifrə bərpa linki göndəriləcək. Gələnlər və spam qovluğunu yoxlayın.';
export async function requestReset(b){
 if(!resetEnabled())fail(503,'Şifrə bərpası üçün email xidməti hələ qoşulmayıb.');
 const email=text(b.email,'Email',3,200).toLowerCase();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail(400,'Email ünvanını düzgün yazın.');
 await rateLimit('reset:global',100,3600);await rateLimit('reset:'+email,3,3600);
 const user=(await query("SELECT id FROM users WHERE email=$1 AND status='active'",[email])).rows[0];
 if(user){
  const token=randomBytes(32).toString('hex');
  // No raw token is stored or returned to the caller; the link is delivered only to the account email.
  await query("INSERT INTO password_resets(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '20 minutes')",[hash(token),user.id]);
  const link=new URL('/sifre-berpa.html',process.env.APP_ORIGIN);link.hash='token='+token;
  try{
   const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(10000),body:JSON.stringify({from:process.env.EMAIL_FROM,to:[email],subject:'SosAvto — şifrəni yenilə',text:`Şifrənizi yeniləmək üçün bu linki açın:\n${link.href}\n\nLink 20 dəqiqə ərzində bir dəfə istifadə oluna bilər. Sorğunu siz etməmisinizsə, bu məktubu nəzərə almayın.`})});
   if(!response.ok)throw new Error('EMAIL_SEND_FAILED');
  }catch{
   await query('DELETE FROM password_resets WHERE token_hash=$1',[hash(token)]);
   // Keep the same public response for unknown and known addresses, including provider failures.
   console.error(JSON.stringify({event:'password_reset_delivery_failed'}));
  }
 }
 return {message:generic};
}
export async function completeReset(b){
 const token=text(b.token,'Bərpa linki',64,64);if(!/^[a-f0-9]{64}$/.test(token))fail(400,'Bərpa linki düzgün deyil.');
 await rateLimit('reset-complete:global',200,3600);await rateLimit('reset-token:'+token,5,900);
 const password=text(b.password,'Yeni şifrə',10,72);if(Buffer.byteLength(password)>72)fail(400,'Şifrə 72 baytdan uzun ola bilməz.');
 const passwordHash=await bcrypt.hash(password,12);
 await transaction(async c=>{
  // Serialize reset attempts for one account. Consuming a link and revoking sessions are atomic.
  const u=(await c.query("SELECT u.id FROM users u JOIN password_resets r ON r.user_id=u.id WHERE r.token_hash=$1 AND r.expires_at>now() AND u.status='active' FOR UPDATE OF u",[hash(token)])).rows[0];
  if(!u)fail(400,'Linkin vaxtı bitib və ya artıq istifadə olunub. Yeni bərpa linki istəyin.');
  const consumed=await c.query('DELETE FROM password_resets WHERE token_hash=$1 AND expires_at>now() RETURNING user_id',[hash(token)]);
  if(!consumed.rows.length)fail(400,'Link artıq istifadə olunub.');
  await c.query('UPDATE users SET password_hash=$1 WHERE id=$2',[passwordHash,u.id]);
  await c.query('DELETE FROM password_resets WHERE user_id=$1',[u.id]);
  await c.query('DELETE FROM sessions WHERE user_id=$1',[u.id]);
 });
 return {ok:true};
}
