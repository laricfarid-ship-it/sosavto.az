import {S3Client,DeleteObjectCommand} from '@aws-sdk/client-s3';
import {unlink} from 'node:fs/promises';
import {query} from './db.mjs';

function storageKey(url){
 const base=process.env.S3_PUBLIC_URL?.replace(/\/$/,'');
 if(base&&url.startsWith(base+'/')){
  const key=url.slice(base.length+1);
  if(/^stories\/[a-f0-9-]{36}\/[a-f0-9-]{36}\.(mp4|webm)$/.test(key))return {kind:'s3',key};
 }
 const match=url.match(/^\/media\/([a-f0-9-]{36})\.(mp4|webm)$/);
 if(match&&process.env.LOCAL_DATABASE==='true'&&process.env.NODE_ENV!=='production'&&!process.env.VERCEL)return {kind:'local',key:match[1]+'.'+match[2]};
 return null;
}
export async function cleanupStories({limit=100}={}){
 const rows=(await query(`SELECT v.id,v.url FROM story_videos v
 WHERE NOT EXISTS(SELECT 1 FROM stories s WHERE s.media_url=v.url AND s.expires_at>now())
 AND (v.created_at<now()-interval '48 hours' OR EXISTS(SELECT 1 FROM stories s WHERE s.media_url=v.url AND s.expires_at<=now()))
 ORDER BY v.created_at LIMIT $1`,[limit])).rows;
 let deleted=0,failed=0;
 const client=process.env.S3_BUCKET?new S3Client({endpoint:process.env.S3_ENDPOINT||undefined,region:process.env.S3_REGION||'auto',credentials:{accessKeyId:process.env.S3_ACCESS_KEY_ID,secretAccessKey:process.env.S3_SECRET_ACCESS_KEY}}):null;
 for(const v of rows){
  try{
   const loc=storageKey(v.url);
   if(!loc)throw Error('Unknown media location');
   if(loc.kind==='s3'){
    if(!client)throw Error('S3 not configured');
    await client.send(new DeleteObjectCommand({Bucket:process.env.S3_BUCKET,Key:loc.key}));
   }else await unlink('.data/uploads/'+loc.key).catch(e=>{if(e.code!=='ENOENT')throw e;});
   await query('DELETE FROM stories WHERE media_url=$1 AND expires_at<=now()',[v.url]);
   await query('DELETE FROM story_videos WHERE id=$1 AND NOT EXISTS(SELECT 1 FROM stories WHERE media_url=$2 AND expires_at>now())',[v.id,v.url]);
   deleted++;
  }catch(e){failed++;console.error('Story cleanup failed',v.id,e.message);}
 }
 const expired=(await query(`DELETE FROM stories WHERE expires_at<=now() AND media_type='image' RETURNING id`)).rows.length;
 return {deletedVideos:deleted,failedVideos:failed,expiredImageRecords:expired};
}
