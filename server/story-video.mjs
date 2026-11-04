import {S3Client,PutObjectCommand} from '@aws-sdk/client-s3';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {query} from './db.mjs';
import {fail} from './security.mjs';

export async function uploadStoryVideo(user,b){
 if(typeof b.data!=='string'||b.data.length>4200000||!/^data:video\/(mp4|webm);base64,/.test(b.data))fail(400,'MP4 və ya WebM video seçin (maksimum 3 MB).');
 const mime=b.data.slice(5,b.data.indexOf(';'));
 const encoded=b.data.slice(b.data.indexOf(',')+1);
 if(!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))fail(400,'Video məlumatı düzgün deyil.');
 const bytes=Buffer.from(encoded,'base64');
 if(!bytes.length||bytes.length>3*1024*1024)fail(413,'Video maksimum 3 MB ola bilər.');
 if(mime==='video/mp4'&&!(bytes.subarray(4,8).toString('ascii')==='ftyp'))fail(400,'MP4 faylı düzgün deyil.');
 if(mime==='video/webm'&&!(bytes.subarray(0,4).toString('hex')==='1a45dfa3'))fail(400,'WebM faylı düzgün deyil.');
 const id=randomUUID(),ext=mime==='video/mp4'?'mp4':'webm',key=`stories/${user.id}/${id}.${ext}`;
 let url;
 if(process.env.S3_BUCKET&&process.env.S3_PUBLIC_URL){
  const s3=new S3Client({endpoint:process.env.S3_ENDPOINT||undefined,region:process.env.S3_REGION||'auto',credentials:{accessKeyId:process.env.S3_ACCESS_KEY_ID,secretAccessKey:process.env.S3_SECRET_ACCESS_KEY}});
  await s3.send(new PutObjectCommand({Bucket:process.env.S3_BUCKET,Key:key,Body:bytes,ContentType:mime,CacheControl:'public,max-age=86400'}));
  url=`${process.env.S3_PUBLIC_URL.replace(/\/$/,'')}/${key}`;
 }else if(process.env.LOCAL_DATABASE==='true'&&process.env.NODE_ENV!=='production'&&!process.env.VERCEL){
  await mkdir('.data/uploads',{recursive:true});await writeFile(`.data/uploads/${id}.${ext}`,bytes);url=`/media/${id}.${ext}`;
 }else fail(503,'Video yükləmə xidməti hələ qoşulmayıb.');
 await query('INSERT INTO story_videos(id,user_id,url) VALUES($1,$2,$3)',[id,user.id,url]);
 return {id,url};
}
