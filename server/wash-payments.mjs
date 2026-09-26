import {fail} from './security.mjs';
// No provider is installed. An environment flag alone must never enable checkout.
// Replace only after merchant setup, verified callbacks and refund tests are ready.
export function washPaymentOptions(){
 return {card:{enabled:false,status:'planned',label:'Kartla ödəniş',message:'Tezliklə — hazırda aktiv deyil'},cash:{label:'Yerində nağd'}};
}
export function requireCardCheckout(){fail(503,'Kartla ödəniş hazırda aktiv deyil.');}
