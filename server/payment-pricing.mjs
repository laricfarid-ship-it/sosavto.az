// Shared server-side checkout price calculation. No live payment processing.
export const WASH_PLATFORM_FEE_MINOR=100;
const MAX_MINOR=100000000;
function minor(value,label){
 if(!Number.isSafeInteger(value)||value<0||value>MAX_MINOR)throw new RangeError(label+' must be a safe nonnegative integer in qepik');
 return value;
}
export function washCheckoutQuote(washPriceMinor){
 const serviceAmountMinor=minor(washPriceMinor,'wash price');
 if(serviceAmountMinor===0)throw new RangeError('wash price must be positive');
 return Object.freeze({
  service_type:'wash_reservation',currency:'AZN',
  service_amount_minor:serviceAmountMinor,
  platform_fee_minor:WASH_PLATFORM_FEE_MINOR,
  customer_total_minor:serviceAmountMinor+WASH_PLATFORM_FEE_MINOR,
  provider_entitlement_minor:serviceAmountMinor
 });
}
export function promotionCheckoutQuote(amountMinor){
 const price=minor(amountMinor,'promotion price');
 if(!price)throw new RangeError('promotion price must be positive');
 return Object.freeze({service_type:'listing_promotion',currency:'AZN',service_amount_minor:price,platform_fee_minor:0,customer_total_minor:price,provider_entitlement_minor:0});
}
// SOS fees cannot be assumed until merchant settlement and platform fee policies are approved.
export function sosCheckoutQuote({arrival_minor,labor_minor,parts_minor,platform_fee_minor=0}){
 const arrival=minor(arrival_minor,'arrival'),labor=minor(labor_minor,'labor'),parts=minor(parts_minor,'parts'),fee=minor(platform_fee_minor,'platform fee');
 const provider=arrival+labor+parts,total=provider+fee;
 if(!Number.isSafeInteger(total)||total>MAX_MINOR)throw new RangeError('total exceeds supported maximum');
 if(!provider)throw new RangeError('SOS quote must be positive');
 return Object.freeze({service_type:'sos_assistance',currency:'AZN',service_amount_minor:provider,platform_fee_minor:fee,customer_total_minor:total,provider_entitlement_minor:provider});
}
