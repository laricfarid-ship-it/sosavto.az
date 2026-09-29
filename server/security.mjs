import {randomBytes,createHash} from 'node:crypto';
import {isIP} from 'node:net';
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
 const origins=[];
 if(process.env.APP_ORIGIN)origins.push(new URL(process.env.APP_ORIGIN).origin);
 // Trust only platform-provided deployment hosts, never request Host headers.
 if(process.env.VERCEL==='1'&&process.env.VERCEL_ENV==='preview'){
  for(const host of [process.env.VERCEL_URL,process.env.VERCEL_BRANCH_URL]){
   if(host&&/^[a-z0-9-]+\.vercel\.app$/.test(host))origins.push('https://'+host);
  }
 }
 if(!origins.length)fail(503,'Sayt ünvanı hələ konfiqurasiya edilməyib.');
 if(!origins.includes(origin))fail(403,'Sorğunun mənbəyi təsdiqlənmədi.');
 if(!String(req.headers['content-type']||'').startsWith('application/json'))fail(415,'JSON sorğusu tələb olunur.');
}
export async function rateLimit(key,limit,seconds){
 const r=await query(`INSERT INTO rate_limits(key,hits,expires_at) VALUES($1,1,now()+($2::integer*interval '1 second'))
 ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN rate_limits.expires_at<now() THEN 1 ELSE LEAST(rate_limits.hits+1,1000000) END,
 expires_at=CASE WHEN rate_limits.expires_at<now() THEN EXCLUDED.expires_at ELSE rate_limits.expires_at END RETURNING hits,expires_at`,[hash(key),seconds]);
 if(r.rows[0].hits>limit){const e=new HttpError(429,'Çox sayda cəhd etdiniz. Bir qədər sonra yenidən sınayın.');e.retryAfter=Math.max(1,Math.ceil((new Date(r.rows[0].expires_at)-Date.now())/1000));throw e;}
}
// Only trust the platform-controlled forwarding header on Vercel. Direct Node
// deployments use the socket peer, never arbitrary client forwarding headers.
// https://vercel.com/docs/headers/request-headers#x-vercel-forwarded-for
export function clientAddress(req){
 const candidate=process.env.VERCEL?req.headers['x-vercel-forwarded-for']:req.socket?.remoteAddress;
 if(typeof candidate!=='string'||!isIP(candidate.trim()))return 'unknown';
 let ip=candidate.trim().toLowerCase();
 if(isIP(ip)===6){
  const canonical=new URL(`http://[${ip}]/`).hostname.slice(1,-1);
  const [left,right='']=canonical.split('::');const a=left?left.split(':'):[],b=right?right.split(':'):[];
  const parts=canonical.includes('::')?[...a,...Array(8-a.length-b.length).fill('0'),...b]:a;
  if(parts.slice(0,5).every(p=>p==='0')&&parts[5]==='ffff')return `${parseInt(parts[6],16)>>8}.${parseInt(parts[6],16)&255}.${parseInt(parts[7],16)>>8}.${parseInt(parts[7],16)&255}`;
  // One IPv6 /64 shares a bucket; rotating interface addresses cannot reset it.
  ip=parts.slice(0,4).join(':')+'::/64';
 }
 return ip;
}
export async function body(req){
 const max=new URL(req.url,'http://localhost').pathname.replace(/\/$/,'')==='/api/uploads'?4500000:65536;
 if(Number(req.headers['content-length'])>max)fail(413,'Sorğu çox böyükdür.');
 let value;
 if(req.body!==undefined&&!Buffer.isBuffer(req.body)&&typeof req.body!=='string'){
  if(Buffer.byteLength(JSON.stringify(req.body))>max)fail(413,'Sorğu çox böyükdür.');value=req.body;
 }else{
  let raw;
  if(req.body!==undefined){raw=Buffer.isBuffer(req.body)?req.body:Buffer.from(req.body);if(raw.length>max)fail(413,'Sorğu çox böyükdür.');}
  else {let size=0;const chunks=[];for await(const part of req){const chunk=Buffer.isBuffer(part)?part:Buffer.from(part);size+=chunk.length;if(size>max)fail(413,'Sorğu çox böyükdür.');chunks.push(chunk);}raw=Buffer.concat(chunks);}
  try{value=JSON.parse(raw.toString('utf8')||'{}');}catch{fail(400,'Sorğu düzgün deyil.');}
 }
 if(!value||typeof value!=='object'||Array.isArray(value))fail(400,'JSON obyekti tələb olunur.');
 return value;
}
export function text(value,name,min=0,max=200){if(typeof value!=='string')fail(400,`${name} düzgün daxil edilməyib.`);const v=value.trim();if(v.length<min||v.length>max)fail(400,`${name}: ${min}–${max} simvol tələb olunur.`);return v;}
export function uuid(v){if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v||''))fail(400,'Yanlış identifikator.');return v;}
export function number(v,name,min,max,optional=false){if(optional&&(v==null||v===''))return null;const n=Number(v);if(v===''||v==null||!Number.isFinite(n)||n<min||n>max)fail(400,`${name} düzgün deyil.`);return n;}
