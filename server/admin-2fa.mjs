import {createHmac,randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {query,transaction} from './db.mjs';
import {fail,hash,rateLimit,requireAdmin,body,createSession} from './security.mjs';

const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32(bytes){let bits=0,value=0,out='';for(const b of bytes){value=(value<<8)|b;bits+=8;while(bits>=5){out+=alphabet[(value>>>(bits-5))&31];bits-=5;}}if(bits)out+=alphabet[(value<<(5-bits))&31];return out;}
function unbase32(s){let bits=0,value=0,out=[];for(const c of s){const n=alphabet.indexOf(c);if(n<0)throw Error('Invalid base32');value=(value<<5)|n;bits+=5;if(bits>=8){out.push((value>>>(bits-8))&255);bits-=8;}}return Buffer.from(out);}
export function newTotpSecret(){return base32(randomBytes(20));}
export function totp(secret,now=Date.now()){const counter=Math.floor(now/30000),buf=Buffer.alloc(8);buf.writeBigUInt64BE(BigInt(counter));const digest=createHmac('sha1',unbase32(secret)).update(buf).digest(),offset=digest[digest.length-1]&15;return String((digest.readUInt32BE(offset)&0x7fffffff)%1000000).padStart(6,'0');}
export function verifyTotp(secret,code,now=Date.now()){if(!/^\d{6}$/.test(String(code||'')))return false;for(let delta=-1;delta<=1;delta++){const expected=totp(secret,now+delta*30000);const a=Buffer.from(expected),b=Buffer.from(String(code));if(a.length===b.length&&timingSafeEqual(a,b))return true;}return false;}
export async function admin2fa(req,res,user,path,method){
 if(path==='/api/admin/2fa/status'&&method==='GET'){requireAdmin(user);const r=await query('SELECT enabled FROM admin_totp WHERE user_id=$1',[user.id]);return {enabled:!!r.rows[0]?.enabled};}
 if(path==='/api/admin/2fa/setup'&&method==='POST'){
  requireAdmin(user);await rateLimit('admin2fa-setup:'+user.id,5,900);
  const secret=newTotpSecret();await query('INSERT INTO admin_totp(user_id,secret,enabled,updated_at) VALUES($1,$2,false,now()) ON CONFLICT(user_id) DO UPDATE SET secret=EXCLUDED.secret,enabled=false,updated_at=now()',[user.id,secret]);
  const issuer='SosAvto',label=encodeURIComponent(user.email||user.username),uri='otpauth://totp/'+encodeURIComponent(issuer)+':'+label+'?secret='+secret+'&issuer='+encodeURIComponent(issuer)+'&algorithm=SHA1&digits=6&period=30';
  return {secret,otpauthUri:uri,manualEntry:true};
 }
 if(path==='/api/admin/2fa/confirm'&&method==='POST'){
  requireAdmin(user);await rateLimit('admin2fa-confirm:'+user.id,10,900);const b=await body(req);const r=(await query('SELECT secret FROM admin_totp WHERE user_id=$1 AND enabled=false',[user.id])).rows[0];if(!r||!verifyTotp(r.secret,b.code))fail(400,'Kod düzgün deyil. Authenticator-da göstərilən cari 6 rəqəmli kodu daxil edin.');
  await query('UPDATE admin_totp SET enabled=true,updated_at=now() WHERE user_id=$1',[user.id]);await query('DELETE FROM sessions WHERE user_id=$1',[user.id]);await createSession(res,user);return {ok:true,enabled:true};
 }
 if(path==='/api/admin/2fa/disable'&&method==='POST'){
  requireAdmin(user);await rateLimit('admin2fa-disable:'+user.id,5,900);const b=await body(req);const r=(await query('SELECT secret,enabled FROM admin_totp WHERE user_id=$1',[user.id])).rows[0];if(!r?.enabled||!verifyTotp(r.secret,b.code))fail(400,'Kod düzgün deyil. 2FA söndürülmədi.');
  await query('DELETE FROM admin_totp WHERE user_id=$1',[user.id]);return {ok:true,enabled:false};
 }
 return null;
}
export async function verifyAdminLogin(req,res,user,code){
 const row=(await query('SELECT secret,enabled FROM admin_totp WHERE user_id=$1',[user.id])).rows[0];
 if(!row?.enabled)return false;
 await rateLimit('admin2fa-login:'+user.id,8,900);
 if(!verifyTotp(row.secret,code))fail(401,'Authenticator kodu düzgün deyil.');
 return true;
}
export async function issueAdminChallenge(res,user){
 const raw=randomBytes(32).toString('hex');
 await query('INSERT INTO admin_login_challenges(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval \'5 minutes\')',[hash(raw),user.id]);
 res.setHeader('Set-Cookie',`sosavto_admin_challenge=${raw}; Path=/api; HttpOnly; SameSite=Strict; Max-Age=300${process.env.NODE_ENV==='production'||process.env.VERCEL?'; Secure':''}`);
}
export function challengeToken(req){return (req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('sosavto_admin_challenge='))?.slice('sosavto_admin_challenge='.length)||'';}
export async function challengeUser(req){const raw=challengeToken(req);if(!/^[a-f0-9]{64}$/.test(raw))return null;return (await query('SELECT u.* FROM admin_login_challenges c JOIN users u ON u.id=c.user_id WHERE c.token_hash=$1 AND c.expires_at>now() AND u.role=\'admin\' AND u.status=\'active\'',[hash(raw)])).rows[0]||null;}
export async function consumeChallenge(req,res){const raw=challengeToken(req);if(raw)await query('DELETE FROM admin_login_challenges WHERE token_hash=$1',[hash(raw)]);res.setHeader('Set-Cookie',`sosavto_admin_challenge=; Path=/api; HttpOnly; SameSite=Strict; Max-Age=0${process.env.NODE_ENV==='production'||process.env.VERCEL?'; Secure':''}`);}
