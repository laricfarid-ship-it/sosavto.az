import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {renderSocialImage,prepareSocialImage} from '../server/social-image.mjs';
test('gallery WebP becomes a square JPEG without metadata for Instagram',async()=>{
 const webp=await sharp({create:{width:1600,height:900,channels:3,background:'#123456'}}).webp().toBuffer();
 const jpeg=await renderSocialImage(webp);const meta=await sharp(jpeg).metadata();
 assert.equal(meta.format,'jpeg');assert.equal(meta.width,1080);assert.equal(meta.height,1080);assert.equal(meta.exif,undefined);
});
test('social image conversion fails closed without storage and rejects external sources',async()=>{
 const saved={...process.env};try{
  delete process.env.S3_BUCKET;await assert.rejects(prepareSocialImage('https://evil.example/x.webp','11111111-1111-4111-8111-111111111111'),/META_IMAGE_STORAGE/);
  process.env.S3_BUCKET='test';process.env.S3_PUBLIC_URL='https://storage.example.test/public';
  await assert.rejects(prepareSocialImage('https://evil.example/x.webp','11111111-1111-4111-8111-111111111111'),/META_IMAGE_SOURCE/);
 }finally{process.env=saved;}
});
test('JPEG is stored on the existing bucket and only a public URL is returned',async()=>{
 const {S3Client}=await import('@aws-sdk/client-s3');
 const saved={...process.env},oldFetch=global.fetch,oldSend=S3Client.prototype.send;
 try{
  process.env.S3_BUCKET='test';process.env.S3_PUBLIC_URL='https://storage.example.test/public';
  const source=await sharp({create:{width:800,height:600,channels:3,background:'#ffffff'}}).webp().toBuffer();
  global.fetch=async()=>({ok:true,headers:new Headers({'content-length':String(source.length)}),body:(async function*(){yield source;})()});
  let input;S3Client.prototype.send=async function(command){input=command.input;return {};};
  const url=await prepareSocialImage('https://storage.example.test/public/car.webp','11111111-1111-4111-8111-111111111111');
  assert.match(url,/^https:\/\/storage.example.test\/public\/social\/.+\.jpg$/);
  assert.equal(input.ContentType,'image/jpeg');assert.equal((await sharp(input.Body).metadata()).format,'jpeg');
 }finally{global.fetch=oldFetch;S3Client.prototype.send=oldSend;process.env=saved;}
});
