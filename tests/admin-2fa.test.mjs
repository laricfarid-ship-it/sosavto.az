import test from 'node:test';
import assert from 'node:assert/strict';
import {newTotpSecret,totp,verifyTotp} from '../server/admin-2fa.mjs';

test('TOTP generates six digits and accepts the current time-step',()=>{
 const secret=newTotpSecret();
 const code=totp(secret);
 assert.match(code,/^\d{6}$/);
 assert.equal(verifyTotp(secret,code),true);
});
test('TOTP rejects malformed and incorrect codes',()=>{
 const secret=newTotpSecret();
 assert.equal(verifyTotp(secret,'123'),false);
 assert.equal(verifyTotp(secret,'abcdef'),false);
 const wrong=String((Number(totp(secret))+1)%1000000).padStart(6,'0');
 assert.equal(verifyTotp(secret,wrong),false);
});
test('TOTP accepts a small clock drift but not a distant time-step',()=>{
 const secret=newTotpSecret(),now=Date.now();
 assert.equal(verifyTotp(secret,totp(secret,now+30000),now),true);
 assert.equal(verifyTotp(secret,totp(secret,now+120000),now),false);
});
