import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {isStoryVideo} from '../assets/story-video.js';
import {videoFormat} from '../server/stories.mjs';

test('Story recognizes video extensions with missing or generic MIME types',()=>{
 assert.ok(isStoryVideo(new File(['video'],'CLIP.MOV')));
 assert.ok(isStoryVideo(new File(['video'],'clip.mkv',{type:'application/octet-stream'})));
 assert.ok(isStoryVideo(new File(['video'],'clip',{type:'video/mp4'})));
 assert.equal(isStoryVideo(new File(['image'],'photo.png',{type:'image/png'})),false);
});

test('Story worker produces an uploadable MP4 using its bundled converter',async()=>{
 const require=createRequire(import.meta.url);
 const wasmBinary=await readFile(require.resolve('@ffmpeg/core/wasm'));
 const createFFmpegCore=require('@ffmpeg/core');
 globalThis.importScripts=()=>{};
 globalThis.self={
  createFFmpegCore:options=>createFFmpegCore({...options,wasmBinary}),
  location:{href:'http://localhost/assets/story-video-worker.js'}
 };
 const messages=[];
 self.postMessage=message=>messages.push(message);
 try{
  await import('../assets/story-video-worker.js');
  const input=await readFile(new URL('./fixtures/story-video.mp4',import.meta.url));
  await self.onmessage({data:new File([input],'phone-video.mp4')});
  const output=messages.at(-1);
  assert.equal(output?.type,'video',output?.message);
  const bytes=Buffer.from(output.bytes);
  assert.ok(bytes.length<=3*1024*1024);
  assert.equal(videoFormat(bytes,'mp4'),'mp4');
 }finally{
  delete globalThis.self;
  delete globalThis.importScripts;
 }
});
