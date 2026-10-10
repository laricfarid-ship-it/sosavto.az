import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateCredit} from '../assets/credit.js';
test('annuity benchmark: 10000 at 12% for 12 months',()=>{
 const r=calculateCredit({price:12000,downPayment:2000,annualRate:12,months:12});
 assert.ok(Math.abs(r.monthly-888.4878867834)<1e-8);assert.ok(Math.abs(r.interest-661.8546414008)<1e-7);assert.equal(r.total,r.repayment+2000);
});
test('zero interest and fully prepaid cases stay finite',()=>{
 assert.equal(calculateCredit({price:12000,downPayment:2000,annualRate:0,months:20}).monthly,500);
 const r=calculateCredit({price:12000,downPayment:12000,annualRate:15,months:36});assert.equal(r.monthly,0);assert.equal(r.total,12000);
 assert.ok(Number.isFinite(calculateCredit({price:10000,downPayment:0,annualRate:1e-10,months:120}).monthly));
});
test('invalid amounts, rates and terms are rejected',()=>{
 const base={price:10000,downPayment:2000,annualRate:12,months:36};
 for(const invalid of [{price:0},{price:Infinity},{price:NaN},{price:10000001},{downPayment:-1},{downPayment:10001},{months:0},{months:121},{months:1.5},{annualRate:-1},{annualRate:101}])assert.throws(()=>calculateCredit({...base,...invalid}));
});
