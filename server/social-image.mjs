import sharp from 'sharp';
import {createHash} from 'node:crypto';
import {S3Client,PutObjectCommand} from '@aws-sdk/client-s3';
// Instagram feed photos require JPEG. The normal gallery stores WebP.
export async function renderSocialImage(input) {
 return sharp(input,{limitInputPixels:40000000}).rotate().flatten({background:'#ffffff'})
  .resize(1080,1080,{fit:'contain',background:'#ffffff'}).jpeg({quality:90}).toBuffer();
}
export async function prepareSocialImage(source, listingId) {
 if (!/^[a-f0-9-]{36}$/i.test(listingId || '') || !process.env.S3_BUCKET || !process.env.S3_PUBLIC_URL) throw new Error('META_IMAGE_STORAGE_NOT_CONFIGURED');
 const origin = new URL(process.env.S3_PUBLIC_URL);
 const url = new URL(source);
 if (url.origin !== origin.origin || !url.pathname.startsWith(origin.pathname.replace(/\/$/,'')+'/') || url.search || url.username || url.password || url.protocol !== 'https:') throw new Error('META_IMAGE_SOURCE_INVALID');
 let response;
 try { response = await fetch(url,{redirect:'error',signal:AbortSignal.timeout(5000)}); }
 catch { throw new Error('META_IMAGE_DOWNLOAD_FAILED'); }
 if (!response.ok || Number(response.headers.get('content-length'))>4000000) throw new Error('META_IMAGE_DOWNLOAD_FAILED');
 const parts=[];let size=0;
 for await (const part of response.body) { size+=part.length;if(size>4000000)throw new Error('META_IMAGE_TOO_LARGE');parts.push(part); }
 let image;
 try { image=await renderSocialImage(Buffer.concat(parts)); }
 catch { throw new Error('META_IMAGE_CONVERSION_FAILED'); }
 const key=`social/${listingId}/${createHash('sha256').update(image).digest('hex').slice(0,24)}.jpg`;
 const s3=new S3Client({endpoint:process.env.S3_ENDPOINT||undefined,region:process.env.S3_REGION||'auto',credentials:{accessKeyId:process.env.S3_ACCESS_KEY_ID,secretAccessKey:process.env.S3_SECRET_ACCESS_KEY}});
 try { await s3.send(new PutObjectCommand({Bucket:process.env.S3_BUCKET,Key:key,Body:image,ContentType:'image/jpeg',CacheControl:'public,max-age=31536000,immutable'}),{abortSignal:AbortSignal.timeout(5000)}); }
 catch { throw new Error('META_IMAGE_UPLOAD_FAILED'); }
 return process.env.S3_PUBLIC_URL.replace(/\/$/,'')+'/'+key;
}
