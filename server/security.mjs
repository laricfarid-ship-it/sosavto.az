import {randomBytes,createHash} from 'node:crypto';
import {query} from './db.mjs';
export class HttpError extends Error {constructor(status,message){super(message);this.status=status;}}
export const fail=(status,message)=>{throw new HttpError(status,message);};
export const hash=t=>createHash('sha256').update(t).digest('hex');
export const safeUser=u=>u?{id:u.id,fullname:u.fullname,username:u.username,email:u.email,phone:u.phone,role:u.role}:null;
export async function session(req){
 const token=(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('sosavto_session='))?.slice(16);
 if(!token || !/^[a-f0-9]{64}$/.test(token))return null;
 return (await query("SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.status='active'",[hash(token)])).rows[0]||null;
}
export async function createSession(res,user){
 const t=randomBytes(32).toString('hex');await query("INSERT INTO sessions VALUES($1,$2,now()+interval '7 days')",[hash(t),user.id]);
 res.setHeader('Set-Cookie',`sosavto_session=${t}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${process.env.NODE_ENV==='production'||process.env.VERCEL?'; Secure':''}`);
}
export const requireUser=u=>{if(!u)fail(401,'Davam etmək üçün hesabınıza daxil olun.');return u;};
export const requireAdmin=u=>{requireUser(u);if(u.role!=='admin')fail(403,'Bu əməliyyat üçün icazəniz yoxdur.');};
export function originCheck(req){
 if(['GET','HEAD','OPTIONS'].includes(req.method))return;
 const origin=req.headers.origin;
 const allowed=process.env.APP_ORIGIN;
 if(!allowed)fail(503,'Sayt ünvanı hələ konfiqurasiya edilməyib.');
 if(origin!==new URL(allowed).origin)fail(403,'Sorğunun mənbəyi təsdiqlənmədi.');
 if(!String(req.headers['content-type']||'').startsWith('application/json'))fail(415,'JSON sorğusu tələb olunur.');
}
export async function rateLimit(key,limit,seconds){
 const r=await query(`INSERT INTO rate_limits(key,hits,expires_at) VALUES($1,1,now()+($2::integer*interval '1 second'))
 ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN rate_limits.expires_at<now() THEN 1 ELSE rate_limits.hits+1 END,
 expires_at=CASE WHEN rate_limits.expires_at<now() THEN EXCLUDED.expires_at ELSE rate_limits.expires_at END RETURNING hits`,[hash(key),seconds]);
 if(r.rows[0].hits>limit)fail(429,'Çox sayda cəhd etdiniz. Bir qədər sonra yenidən sınayın.');
}
export async function body(req){
 if(req.body && typeof req.body==='object') {if(Buffer.byteLength(JSON.stringify(req.body))>4500000)fail(413,'Fayl çox böyükdür.');return req.body;}
 let raw='';for await(const part of req){raw+=part;if(Buffer.byteLength(raw)>4500000)fail(413,'Fayl çox böyükdür.');}
 try{return JSON.parse(raw||'{}');}catch{fail(400,'Sorğu düzgün deyil.');}
}
export function text(value,name,min=0,max=200){if(typeof value!=='string')fail(400,`${name} düzgün daxil edilməyib.`);const v=value.trim();if(v.length<min||v.length>max)fail(400,`${name}: ${min}–${max} simvol tələb olunur.`);return v;}
export function uuid(v){if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v||''))fail(400,'Yanlış identifikator.');return v;}
export function number(v,name,min,max,optional=false){if(optional&&(v==null||v===''))return null;const n=Number(v);if(v===''||v==null||!Number.isFinite(n)||n<min||n>max)fail(400,`${name} düzgün deyil.`);return n;}
