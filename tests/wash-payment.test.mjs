import test from 'node:test';
import assert from 'node:assert/strict';
import {paymentLabel} from '../assets/wash-payment.js';
import {washPaymentOptions,requireCardCheckout} from '../server/wash-payments.mjs';
test('card remains unavailable even when an activation flag is accidentally set',()=>{
 const previous=process.env.WASH_CARD_ENABLED;process.env.WASH_CARD_ENABLED='true';
 try{assert.equal(washPaymentOptions().card.enabled,false);assert.throws(requireCardCheckout,/aktiv deyil/);}finally{if(previous===undefined)delete process.env.WASH_CARD_ENABLED;else process.env.WASH_CARD_ENABLED=previous;}
});
test('booking completion is not rendered as a successful payment',()=>{
 assert.match(paymentLabel({method:'card',status:'completed',payment_status:'unpaid'}),/təsdiqlənməyib/);
 assert.match(paymentLabel({method:'cash',status:'completed',payment_status:'unpaid'}),/nağd/);
 assert.equal(paymentLabel({method:'card',payment_status:'paid'}),'Ödəniş təsdiqlənib');
 assert.equal(paymentLabel({payment_status:'refund_pending'}),'Geri qaytarılma gözlənilir');
 assert.equal(paymentLabel({payment_status:'refunded'}),'Məbləğ geri qaytarılıb');
});

import {washEnabled} from '../server/wash-config.mjs';
test('production rollout defaults on; explicit disable and isolated preview remain off',()=>{
 assert.equal(washEnabled({VERCEL_ENV:'production'}),true);
 assert.equal(washEnabled({VERCEL_ENV:'production',WASH_ENABLED:'false'}),false);
 assert.equal(washEnabled({VERCEL_ENV:'preview'}),false);
 assert.equal(washEnabled({}),false);
 assert.equal(washEnabled({WASH_ENABLED:'true'}),true);
});
