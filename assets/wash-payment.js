// Labels are separate from booking status: completion does not prove payment.
export function paymentLabel(booking){
 const labels={paid:'Ödəniş təsdiqlənib',refund_pending:'Geri qaytarılma gözlənilir',refunded:'Məbləğ geri qaytarılıb'};
 if(labels[booking.payment_status])return labels[booking.payment_status];
 return booking.method==='card'?'Kart ödənişi təsdiqlənməyib':'Yerində nağd — ödəniş sistemdə təsdiqlənməyib';
}
