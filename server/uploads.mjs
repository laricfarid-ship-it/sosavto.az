import sharp from 'sharp';
import {S3Client,PutObjectCommand} from '@aws-sdk/client-s3';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {query} from './db.mjs';
import {fail} from './security.mjs';
export async function upload(user,b){
 if(typeof b.data!=='string'||b.data.length>4200000||!/^data:image\/(jpeg|png|webp);base64,/.test(b.data))fail(400,'JPEG, PNG və ya WebP şəkli seçin (maksimum 3 MB).');
 const input=Buffer.from(b.data.split(',')[1],'base64');if(input.length>3*1024*1024)fail(413,'Şəkil 3 MB-dan böyükdür.');
 let output;try{output=await sharp(input,{limitInputPixels:40000000}).rotate().resize({width:1600,height:1200,fit:'inside',withoutEnlargement:true}).webp({quality:82}).toBuffer();}catch{fail(400,'Şəkil oxunmadı. Başqa fayl seçin.');}
 const id=randomUUID(),key=`listings/${user.id}/${id}.webp`;let url;
 if(process.env.S3_BUCKET&&process.env.S3_PUBLIC_URL){
 const s3=new S3Client({endpoint:process.env.S3_ENDPOINT||undefined,region:process.env.S3_REGION||'auto',credentials:{accessKeyId:process.env.S3_ACCESS_KEY_ID,secretAccessKey:process.env.S3_SECRET_ACCESS_KEY}});
 await s3.send(new PutObjectCommand({Bucket:process.env.S3_BUCKET,Key:key,Body:output,ContentType:'image/webp',CacheControl:'public,max-age=31536000,immutable'}));url=`${process.env.S3_PUBLIC_URL.replace(/\/$/,'')}/${key}`;
 }else if(process.env.LOCAL_DATABASE==='true'&&process.env.NODE_ENV!=='production'&&!process.env.VERCEL){await mkdir('.data/uploads',{recursive:true});await writeFile(`.data/uploads/${id}.webp`,output);url=`/media/${id}.webp`;}else fail(503,'Şəkil yükləmə xidməti hələ qoşulmayıb.');
 await query('INSERT INTO images(id,user_id,url) VALUES($1,$2,$3)',[id,user.id,url]);return {id,url};
}
