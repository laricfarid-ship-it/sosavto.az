import {randomUUID} from 'node:crypto';
import {mkdir,writeFile,unlink} from 'node:fs/promises';
import sharp from 'sharp';
import {S3Client,PutObjectCommand,DeleteObjectCommand} from '@aws-sdk/client-s3';
import {query,transaction} from './db.mjs';
import {requireUser,requireAdmin,fail,body,text,uuid,rateLimit} from './security.mjs';
const local=()=>process.env.LOCAL_DATABASE==='true'&&process.env.NODE_ENV!=='production'&&!process.env.VERCEL;
const configured=()=>!!(process.env.S3_BUCKET&&process.env.S3_PUBLIC_URL);
const s3=()=>new S3Client({endpoint:process.env.S3_ENDPOINT||undefined,region:process.env.S3_REGION||'auto',credentials:{accessKeyId:process.env.S3_ACCESS_KEY_ID,secretAccessKey:process.env.S3_SECRET_ACCESS_KEY}});
const active="l.status='active' AND NOT (l.details @> '{\"_deleted\":true}'::jsonb)";
const today="(now() AT TIME ZONE 'Asia/Baku')::date";
export function listingReference(value){
 const v=text(value||'','Elan nömrəsi və ya linki',0,500);if(!v)return null;
 if(/^\d{1,15}$/.test(v))return {number:v};
 if(/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(v))return {id:uuid(v)};
 let u;try{u=new URL(v,'https://sosavto.az');}catch{fail(400,'SosAvto elanının linkini və ya nömrəsini yazın.');}
 const allowed=['https://sosavto.az','https://www.sosavto.az'];
 if(process.env.APP_ORIGIN)allowed.push(new URL(process.env.APP_ORIGIN).origin);
 if(!allowed.includes(u.origin)||!['/elan','/elan.html'].includes(u.pathname))fail(400,'Yalnız SosAvto elanının linkini əlavə edin.');
 return {id:uuid(u.searchParams.get('id'))};
}
async function resolveListing(ref,c={query}){
 if(!ref)return null;
 const r=(await c.query(`SELECT l.id,l.title,l.listing_number,l.price,(SELECT url FROM images WHERE listing_id=l.id AND sort_order<100 ORDER BY sort_order,id LIMIT 1) AS image FROM listings l WHERE ${active} AND ${ref.id?'l.id=$1':'l.listing_number=$1'}`,[ref.id||ref.number])).rows[0];
 if(!r)fail(404,'Elan tapılmadı və ya artıq aktiv deyil.');return r;
}
async function allowance(user){
 const r=(await query(`SELECT EXISTS(SELECT 1 FROM story_daily_posts WHERE user_id=$1 AND day=${today}) AS used,(((${today}+1)::timestamp AT TIME ZONE 'Asia/Baku')) AS resets_at`,[user.id])).rows[0];
 return {remaining:r.used?0:1,resets_at:r.resets_at,timezone:'Asia/Baku'};
}
async function removeMedia(key){
 if(!key||!/^stories\/[a-f0-9-]+\/[a-f0-9-]+\.webp$/.test(key))return;
 if(configured())await s3().send(new DeleteObjectCommand({Bucket:process.env.S3_BUCKET,Key:key}));
 else if(local())await unlink('.data/uploads/'+key.split('/').pop()).catch(e=>{if(e.code!=='ENOENT')throw e;});
 else throw Error('STORY_STORAGE_NOT_CONFIGURED');
}
// Bounded, awaited maintenance: no unattended worker and no listing media deletion.
let nextCleanup=0;
async function cleanup(){
 if(Date.now()<nextCleanup)return;nextCleanup=Date.now()+60000;
 try{const rows=(await query('SELECT id,media_key FROM stories WHERE expires_at<now() ORDER BY expires_at LIMIT 20')).rows;
 for(const row of rows){try{await removeMedia(row.media_key);await query('DELETE FROM stories WHERE id=$1 AND expires_at<now()',[row.id]);}catch{ /* Retain the row to retry deletion on a later request. */ }}}
 catch{nextCleanup=0;}
}
export async function stories(req,user,path,method,url){
 if(path==='/api/stories'&&method==='GET'){
 await cleanup();const admin=url.searchParams.get('moderation')==='1';if(admin)requireAdmin(user);
 const cursor=url.searchParams.get('before'),parts=cursor?.split('~');if(cursor&&(parts.length!==2||!Number.isFinite(Date.parse(parts[0]))))fail(400,'Yanlış səhifə göstəricisi.');if(cursor)uuid(parts[1]);
 const args=cursor?[parts[0],parts[1]]:[];
 const rows=(await query(`SELECT s.id,s.caption,s.theme,s.created_at,s.expires_at,s.media_url,s.media_type,s.user_id=$${args.length+1} AS own,u.fullname AS author,
 CASE WHEN ${active} THEN json_build_object('id',l.id,'title',l.title,'number',l.listing_number,'price',l.price) END AS listing
 ${admin?',(SELECT count(*)::integer FROM story_reports r WHERE r.story_id=s.id) AS reports':''}
 FROM stories s JOIN users u ON u.id=s.user_id LEFT JOIN listings l ON l.id=s.listing_id
 WHERE s.expires_at>now() AND u.status='active' AND s.media_type='image' ${cursor?'AND (s.created_at,s.id)<($1::timestamptz,$2::uuid)':''}
 ORDER BY s.created_at DESC,s.id DESC LIMIT 61`,[...args,user?.id||null])).rows;
 const more=rows.length>60;rows.splice(60);
 return {stories:rows,next:more?new Date(rows.at(-1).created_at).toISOString()+'~'+rows.at(-1).id:null,allowance:user?await allowance(user):null,uploads:configured()||local()};
 }
 if(path==='/api/stories/resolve'&&method==='GET'){requireUser(user);return {listing:await resolveListing(listingReference(url.searchParams.get('ref')))};}
 if(path==='/api/stories'&&method==='POST'){
 requireUser(user);await rateLimit('story-post:'+user.id,10,3600);const b=await body(req);
 const caption=text(b.caption||'','Story mətni',0,280),theme=['midnight','ocean','silver'].includes(b.theme)?b.theme:'midnight';
 const ref=listingReference(b.reference);let output;
 if(b.data){
 if(typeof b.data!=='string'||b.data.length>4200000||!/^data:image\/(jpeg|png|webp);base64,/.test(b.data))fail(400,'JPEG, PNG və ya WebP şəkli seçin (maksimum 3 MB).');
 const bytes=Buffer.from(b.data.split(',')[1],'base64');if(bytes.length>3*1024*1024)fail(413,'Şəkil 3 MB-dan böyükdür.');
 try{const im=sharp(bytes,{limitInputPixels:40000000,animated:false});const meta=await im.metadata();if(!['jpeg','png','webp'].includes(meta.format)||meta.pages>1)throw Error();output=await im.rotate().resize({width:1080,height:1920,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer();}catch{fail(400,'Şəkil oxunmadı. Başqa şəkil seçin.');}
 }
 if(!output&&!ref)fail(400,'Şəkil seçin və ya elan nömrəsi/linki əlavə edin.');
 let storedKey;
 try{return await transaction(async c=>{
 // Serialize requests for one account, including multiple tabs and simultaneous submissions.
 await c.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[user.id]);
 const used=(await c.query(`SELECT 1 FROM story_daily_posts WHERE user_id=$1 AND day=${today}`,[user.id])).rows.length;
 if(used)fail(409,'Bugünkü pulsuz storyni artıq paylaşmısınız. Bakı vaxtı ilə gecə 00:00-dan sonra yenidən paylaşa bilərsiniz.');
 const listing=await resolveListing(ref,c);let media=listing?.image;
 if(output){
 if(!configured()&&!local())fail(503,'Şəkil yükləmə xidməti hələ qoşulmayıb.');
 const key=`stories/${user.id}/${randomUUID()}.webp`;
 if(configured()){await s3().send(new PutObjectCommand({Bucket:process.env.S3_BUCKET,Key:key,Body:output,ContentType:'image/webp',CacheControl:'public,max-age=86400'}));media=process.env.S3_PUBLIC_URL.replace(/\/$/,'')+'/'+key;}
 else{await mkdir('.data/uploads',{recursive:true});await writeFile('.data/uploads/'+key.split('/').pop(),output);media='/media/'+key.split('/').pop();}
 storedKey=key;
 }
 if(!media)fail(400,'Bu elanın şəkli yoxdur. Story üçün şəkil əlavə edin.');
 const id=randomUUID();await c.query(`INSERT INTO story_daily_posts(user_id,day) VALUES($1,${today})`,[user.id]);
 await c.query("INSERT INTO stories(id,user_id,media_url,media_type,caption,theme,listing_id,media_key) VALUES($1,$2,$3,'image',$4,$5,$6,$7)",[id,user.id,media,caption,theme,listing?.id||null,storedKey||null]);
 return {id,ok:true};
 });}catch(e){if(storedKey)await removeMedia(storedKey).catch(()=>{});throw e;}
 }
 const match=path.match(/^\/api\/stories\/([a-f0-9-]+)(\/report)?$/);
 if(match){requireUser(user);const id=uuid(match[1]);
 if(match[2]&&method==='POST'){const b=await body(req);const reason=text(b.reason||'Uyğun olmayan məzmun','Şikayət',3,300);await rateLimit('story-report:'+user.id,20,3600);
 const exists=(await query('SELECT id FROM stories WHERE id=$1 AND expires_at>now()',[id])).rows.length;if(!exists)fail(404,'Story artıq əlçatan deyil.');
 await query('INSERT INTO story_reports(story_id,user_id,reason) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[id,user.id,reason]);return {ok:true};}
 if(!match[2]&&method==='DELETE'){
 const result=await query('UPDATE stories SET expires_at=now() WHERE id=$1 AND (user_id=$2 OR $3) RETURNING id',[id,user.id,user.role==='admin']);if(!result.rows.length)fail(404,'Story tapılmadı.');return {ok:true};
 }
 }
 fail(404,'Story əməliyyatı tapılmadı.');
}
