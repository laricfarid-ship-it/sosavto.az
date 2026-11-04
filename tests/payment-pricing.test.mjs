import test from 'node:test';
import assert from 'node:assert/strict';
import {washCheckoutQuote,sosCheckoutQuote,promotionCheckoutQuote,WASH_PLATFORM_FEE_MINOR} from '../server/payment-pricing.mjs';
test('wash charges fixed 1 AZN platform fee on top of 10 AZN service',()=>{
 const q=washCheckoutQuote(1000);assert.equal(WASH_PLATFORM_FEE_MINOR,100);assert.deepEqual([q.service_amount_minor,q.platform_fee_minor,q.customer_total_minor,q.provider_entitlement_minor],[1000,100,1100,1000]);assert.equal(q.currency,'AZN');assert.ok(Object.isFrozen(q));
});
test('wash fee remains fixed for different prices',()=>{assert.equal(washCheckoutQuote(2500).customer_total_minor,2600);});
test('reject invalid prices and floating-point qepik',()=>{for(const n of [0,-1,10.5,NaN,Infinity,'1000',Number.MAX_SAFE_INTEGER])assert.throws(()=>washCheckoutQuote(n));});
test('SOS separates provider quote from platform fee',()=>{assert.deepEqual([sosCheckoutQuote({arrival_minor:1000,labor_minor:2000,parts_minor:500}).customer_total_minor,sosCheckoutQuote({arrival_minor:1000,labor_minor:2000,parts_minor:500}).provider_entitlement_minor],[3500,3500]);assert.equal(sosCheckoutQuote({arrival_minor:1000,labor_minor:2000,parts_minor:500,platform_fee_minor:100}).customer_total_minor,3600);});
test('promotion is paid to platform',()=>{const q=promotionCheckoutQuote(1200);assert.equal(q.customer_total_minor,1200);assert.equal(q.provider_entitlement_minor,0);});
