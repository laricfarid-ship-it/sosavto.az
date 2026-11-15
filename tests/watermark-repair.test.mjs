import test from 'node:test';import assert from 'node:assert/strict';import sharp from 'sharp';
import {repairListingWatermarks} from '../server/watermark-repair.mjs';
const id='11111111-1111-4111-8111-111111111111',user_id='22222222-2222-4222-8222-222222222222',base='https://images.test';
const row={id,user_id,sort_order:0,url:`${base}/listings/${user_id}/${id}.webp`};
test('repair reads clean original, writes a fresh version, then changes the database URL',async()=>{
 const original=await sharp({create:{width:800,height:600,channels:3,background:'#888'}}).webp().toBuffer(),events=[];
 const result=await repairListingWatermarks([row],{publicUrl:base,readOriginal:async key=>{events.push('read');assert.equal(key,`originals/${user_id}/${id}.webp`);return original;},writeImage:async(key,data)=>{events.push('write');assert.match(key,/-wm2.webp$/);assert.ok(data.length>100);},updateImage:async(old,url)=>{events.push('update');assert.equal(old.url,row.url);assert.match(url,/-wm2.webp$/);}});
 assert.deepEqual(events,['read','write','update']);assert.equal(result.repaired,1);
});
test('missing originals and already repaired or unrelated URLs are left untouched',async()=>{
 let writes=0;const result=await repairListingWatermarks([row,{...row,url:row.url.replace('.webp','-wm2.webp')},{...row,url:'https://external.test/a.webp'}],{publicUrl:base,readOriginal:async()=>{const error=Error('missing');error.name='NoSuchKey';throw error;},writeImage:async()=>{writes++;},updateImage:async()=>{writes++;}});assert.equal(writes,0);assert.equal(result.skipped,3);
});
test('failed storage writes never update image records',async()=>{
 const original=await sharp({create:{width:80,height:60,channels:3,background:'#888'}}).webp().toBuffer();let updated=false;
 await assert.rejects(repairListingWatermarks([row],{publicUrl:base,readOriginal:async()=>original,writeImage:async()=>{throw Error('storage unavailable');},updateImage:async()=>{updated=true;}}),/storage unavailable/);assert.equal(updated,false);
});
