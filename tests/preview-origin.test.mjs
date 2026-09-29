import test from 'node:test';
import assert from 'node:assert/strict';
import {originCheck} from '../server/security.mjs';
test('preview accepts only trusted deployment origins and production remains strict',()=>{
 const keys=['APP_ORIGIN','VERCEL','VERCEL_ENV','VERCEL_URL','VERCEL_BRANCH_URL'];
 const saved=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 const check=origin=>originCheck({method:'POST',headers:{origin,'content-type':'application/json',host:'attacker.vercel.app'}});
 try{
 delete process.env.APP_ORIGIN;process.env.VERCEL='1';process.env.VERCEL_ENV='preview';process.env.VERCEL_URL='sosavto-test.vercel.app';process.env.VERCEL_BRANCH_URL='sosavto-git-test.vercel.app';
 assert.doesNotThrow(()=>check('https://sosavto-test.vercel.app'));
 assert.doesNotThrow(()=>check('https://sosavto-git-test.vercel.app'));
 for(const origin of [undefined,'null','https://attacker.vercel.app','http://sosavto-test.vercel.app','https://sosavto-test.vercel.app.evil.test'])assert.throws(()=>check(origin),e=>e.status===403);
 process.env.VERCEL_ENV='production';assert.throws(()=>check('https://sosavto-test.vercel.app'),e=>e.status===503);
 process.env.APP_ORIGIN='https://sosavto.az';assert.doesNotThrow(()=>check('https://sosavto.az'));assert.throws(()=>check('https://sosavto-test.vercel.app'),e=>e.status===403);
 }finally{for(const k of keys){if(saved[k]===undefined)delete process.env[k];else process.env[k]=saved[k];}}
});
