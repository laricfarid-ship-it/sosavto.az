import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareUpload} from '../assets/image-upload.js';
test('large phone photos resize before upload and release their object URL',async()=>{
 const previous={Image:globalThis.Image,document:globalThis.document,create:URL.createObjectURL,revoke:URL.revokeObjectURL};
 let revoked=false,canvas,drawn=false;
 URL.createObjectURL=()=> 'blob:photo';URL.revokeObjectURL=()=>{revoked=true;};
 globalThis.Image=class{naturalWidth=8000;naturalHeight=6000;set src(v){queueMicrotask(()=>this.onload());}};
 globalThis.document={createElement:()=>canvas={getContext:()=>({fillRect(){},drawImage(){drawn=true;}}),toDataURL:()=> 'data:image/jpeg;base64,AAAA'}};
 try{assert.equal(await prepareUpload({size:12*1024*1024,type:'image/jpeg',name:'phone.jpg'}),'data:image/jpeg;base64,AAAA');assert.equal(canvas.width,1600);assert.equal(canvas.height,1200);assert.ok(drawn);assert.ok(revoked);}finally{globalThis.Image=previous.Image;globalThis.document=previous.document;URL.createObjectURL=previous.create;URL.revokeObjectURL=previous.revoke;}
});
test('empty, unsupported and oversized images get actionable errors',async()=>{
 await assert.rejects(prepareUpload({size:0}),/boşdur/);
 await assert.rejects(prepareUpload({size:26*1024*1024}),/25 MB/);
 await assert.rejects(prepareUpload({size:100,type:'image/heic',name:'photo.heic'}),/HEIC/);
});
