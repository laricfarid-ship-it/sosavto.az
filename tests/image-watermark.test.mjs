import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {readFile} from 'node:fs/promises';
import {prepareListingImage} from '../server/image-watermark.mjs';

test('server emblem matches the official website logo',async()=>{
 assert.deepEqual(await readFile(new URL('../server/watermark-logo.svg',import.meta.url)),await readFile(new URL('../assets/brand-sa.svg',import.meta.url)));
});
for(const [width,height,spin] of [[1600,900,false],[600,1000,false],[80,60,false],[2000,1500,true]]){
 test(`embedded center and corner watermarks: ${width}x${height}, spin=${spin}`,async()=>{
  const input=await sharp({create:{width,height,channels:3,background:'#687d88'}}).png().toBuffer();
  const {original,output}=await prepareListingImage(input,{spin});
  const meta=await sharp(output).metadata();
  assert.equal(meta.format,'webp');
  assert.ok(meta.width<= (spin?1200:1600));assert.ok(meta.height<=(spin?900:1200));
  assert.equal(meta.exif,undefined);
  const clean=await sharp(original).raw().toBuffer();
  const stamped=await sharp(output).raw().toBuffer();
  const difference=(x0,y0,x1,y1)=>{
   let total=0;
   for(let y=Math.floor(y0*meta.height);y<Math.floor(y1*meta.height);y++)for(let x=Math.floor(x0*meta.width);x<Math.floor(x1*meta.width);x++){
    const i=(y*meta.width+x)*3;total+=Math.abs(clean[i]-stamped[i])+Math.abs(clean[i+1]-stamped[i+1])+Math.abs(clean[i+2]-stamped[i+2]);
   }
   return total;
  };
  assert.ok(difference(.3,.4,.7,.6)>100,'center text is burned into pixels');
  assert.ok(difference(.7,.85,1,1)>100,'corner logo is burned into pixels');
 });
}
test('orientation is applied before watermark placement and invalid input is rejected',async()=>{
 const input=await sharp({create:{width:800,height:500,channels:3,background:'white'}}).jpeg().withMetadata({orientation:6}).toBuffer();
 const {output}=await prepareListingImage(input);
 const meta=await sharp(output).metadata();
 assert.equal(meta.width,500);assert.equal(meta.height,800);assert.equal(meta.orientation,undefined);
 await assert.rejects(prepareListingImage(Buffer.from('not an image')));
});
