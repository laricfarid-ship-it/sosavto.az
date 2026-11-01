import test from 'node:test';
import assert from 'node:assert/strict';
import {socialSharePreview} from '../server/social-share.mjs';

test('approved listing yields social preview, not publication', () => {
 const p=socialSharePreview({id:'123',title:'Hyundai Elantra',price:20000,city:'Bakı',status:'active'},'https://example.com/car.webp');
 assert.equal(p.published,false);
 assert.deepEqual(p.platforms,['instagram','facebook']);
 assert.match(p.caption,/Hyundai Elantra/);
 assert.match(p.caption,/sosavto.az/);
 assert.equal(p.imageUrl,'https://example.com/car.webp');
});
test('pending and rejected listings cannot be previewed', () => {
 for(const status of ['pending','rejected']) assert.throws(()=>socialSharePreview({id:'123',status}),/LISTING_NOT_ACTIVE/);
});

test('production requires a separate approval gate', async () => {
 const {socialShareEnabled}=await import('../server/social-share.mjs');
 const saved={...process.env};
 try{process.env.SOCIAL_SHARE_ENABLED='true';process.env.VERCEL_ENV='production';delete process.env.SOCIAL_SHARE_PRODUCTION_APPROVED;assert.equal(socialShareEnabled(),false);process.env.VERCEL_ENV='preview';assert.equal(socialShareEnabled(),true);}finally{process.env=saved;}
});

test('system token resolves configured Page and linked Instagram, with no secret in report',async()=>{
 const {socialConnectionReport,publishSocial}=await import('../server/social-share.mjs');
 const saved={...process.env}, original=global.fetch;const calls=[];
 try{
  process.env.META_ACCESS_TOKEN='system-secret-test';process.env.META_FB_PAGE_ID='1479681408553895';delete process.env.META_IG_USER_ID;delete process.env.META_FB_PAGE_ACCESS_TOKEN;delete process.env.META_IG_ACCESS_TOKEN;
  process.env.SOCIAL_SHARE_ENABLED='true';process.env.VERCEL_ENV='preview';process.env.SOCIAL_IMAGE_ORIGIN='https://images.example.test';
  global.fetch=async(url,opts)=>{const u=new URL(url);calls.push({u,opts});assert.ok(!u.searchParams.has('access_token'));let d;
   if(u.pathname.endsWith('/debug_token'))d={data:{is_valid:true,scopes:['pages_read_engagement','pages_manage_posts','instagram_basic','instagram_content_publish']}};
   else if(u.pathname.endsWith('/1479681408553895'))d={id:'1479681408553895',access_token:'derived-page-secret',instagram_business_account:{id:'888'}};
   else if(u.pathname.endsWith('/media'))d={id:'999'};
   else if(u.pathname.endsWith('/999'))d={status_code:'FINISHED'};
   else if(u.pathname.endsWith('/media_publish'))d={id:'1234'};
   else throw Error('unexpected path');
   return {ok:true,json:async()=>d};
  };
  const report=await socialConnectionReport();assert.equal(report.platforms.instagram.readyForManualTest,true);assert.equal(report.platforms.facebook.readyForManualTest,true);assert.doesNotMatch(JSON.stringify(report),/secret/);
  let checkpoint;assert.equal(await publishSocial('instagram',{imageUrl:'https://images.example.test/car.jpg',caption:'car'},async id=>{checkpoint=id;}),'1234');assert.equal(checkpoint,'999');assert.equal(calls.at(-1).opts.headers.Authorization,'Bearer derived-page-secret');
  await assert.rejects(publishSocial('facebook',{imageUrl:'https://evil.example/car.jpg'}),/META_IMAGE/);
  global.fetch=async()=>({ok:false,status:400,json:async()=>({error:{code:190,message:'system-secret-test'}})});
  assert.doesNotMatch(JSON.stringify(await socialConnectionReport()),/secret-test/);
 }finally{global.fetch=original;process.env=saved;}
});
