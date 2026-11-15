import {S3Client,GetObjectCommand,PutObjectCommand} from '@aws-sdk/client-s3';
import {query,close} from '../server/db.mjs';
import {repairListingWatermarks} from '../server/watermark-repair.mjs';
// Production-only, bounded, idempotent repair. URLs change only after the new file exists.
if(process.env.VERCEL_ENV==='production'&&process.env.S3_BUCKET&&process.env.S3_PUBLIC_URL){
 try{
  const client=new S3Client({endpoint:process.env.S3_ENDPOINT||undefined,region:process.env.S3_REGION||'auto',credentials:{accessKeyId:process.env.S3_ACCESS_KEY_ID,secretAccessKey:process.env.S3_SECRET_ACCESS_KEY}});
  const rows=(await query("SELECT i.id,i.user_id,i.url,i.sort_order FROM images i JOIN listings l ON l.id=i.listing_id WHERE NOT COALESCE((l.details->>'_deleted')::boolean,false) AND i.url NOT LIKE '%-wm2.webp' ORDER BY i.created_at DESC LIMIT 200")).rows;
  const result=await repairListingWatermarks(rows,{
   publicUrl:process.env.S3_PUBLIC_URL,
   readOriginal:async key=>{const object=await client.send(new GetObjectCommand({Bucket:process.env.S3_BUCKET,Key:key}));return Buffer.from(await object.Body.transformToByteArray());},
   writeImage:async(key,output)=>{await client.send(new PutObjectCommand({Bucket:process.env.S3_BUCKET,Key:key,Body:output,ContentType:'image/webp',CacheControl:'public,max-age=31536000,immutable'}));},
   updateImage:async(row,url)=>{await query('UPDATE images SET url=$1 WHERE id=$2 AND url=$3',[url,row.id,row.url]);}
  });
  console.log('Watermark repair: '+JSON.stringify(result));
 }finally{await close();}
}
