// Fixed-rate annuity estimate, calculated locally without provider requests.
export function calculateCredit({price,downPayment,months,annualRate}){
 const values=[price,downPayment,months,annualRate];
 if(values.some(v=>typeof v!=='number'||!Number.isFinite(v)))throw Error('Bütün xanaları rəqəmlə doldurun.');
 if(price<=0||price>10000000)throw Error('Qiymət 0-dan böyük, ən çox 10 000 000 ₼ olmalıdır.');
 if(downPayment<0||downPayment>price)throw Error('İlkin ödəniş 0 ilə avtomobilin qiyməti arasında olmalıdır.');
 if(!Number.isInteger(months)||months<1||months>120)throw Error('Müddət 1–120 arasında tam ay olmalıdır.');
 if(annualRate<0||annualRate>100)throw Error('İllik faiz 0–100% arasında olmalıdır.');
 const principal=price-downPayment,rate=annualRate/1200;
 const monthly=principal===0?0:rate===0?principal/months:principal*rate/(-Math.expm1(-months*Math.log1p(rate)));
 const repayment=monthly*months,interest=Math.max(0,repayment-principal);
 return {principal,monthly,repayment,interest,total:downPayment+repayment};
}
const currency=new Intl.NumberFormat('az-AZ',{style:'currency',currency:'AZN',minimumFractionDigits:2,maximumFractionDigits:2});
export function creditMarkup(price){
 const value=Number.isFinite(Number(price))&&Number(price)>0&&Number(price)<=10000000?Number(price):'';
 return `<section class="panel credit-calculator" aria-labelledby="credit-title"><p class="eyebrow">Büdcəni planlaşdır</p><h2 id="credit-title">Kredit kalkulyatoru</h2><p class="muted">Öz şərtlərini daxil et, təxmini aylıq ödənişi hesabla.</p><form id="credit-form" novalidate><div class="credit-fields"><label class="field">Avtomobilin qiyməti (₼)<input name="price" type="number" inputmode="decimal" min="0.01" max="10000000" step="0.01" value="${value}" required></label><label class="field">İlkin ödəniş (₼)<input name="downPayment" type="number" inputmode="decimal" min="0" step="0.01" value="0" required></label><label class="field">Müddət (ay)<input name="months" type="number" inputmode="numeric" min="1" max="120" step="1" value="36" required></label><label class="field">İllik faiz (%)<input name="annualRate" type="number" inputmode="decimal" min="0" max="100" step="any" placeholder="Faizi daxil et" required></label></div><button class="btn primary" type="submit">Hesabla</button><p id="credit-error" class="error" role="alert"></p><div id="credit-result" aria-live="polite" aria-atomic="true" hidden></div></form><p class="muted credit-note">Sabit illik faiz və bərabər aylıq ödəniş əsasında təxmini hesablamadır. Komissiya, sığorta və digər xərclər daxil deyil. Bank təklifi və ya bu elanın kreditlə satıldığına dair təsdiq deyil.</p></section>`;
}
export function mountCredit(root){
 const form=root.querySelector('#credit-form');if(!form)return;
 const error=root.querySelector('#credit-error'),result=root.querySelector('#credit-result');
 function update(showMissing=false){
  result.hidden=true;result.textContent='';error.textContent='';
  const fields=['price','downPayment','months','annualRate'];
  for(const name of fields)form.elements[name].removeAttribute('aria-invalid');
  if(fields.some(name=>form.elements[name].value.trim()==='')){
   if(showMissing){error.textContent='Bütün xanaları doldurun.';for(const name of fields)if(!form.elements[name].value.trim())form.elements[name].setAttribute('aria-invalid','true');}
   return;
  }
  try{
   const data=calculateCredit(Object.fromEntries(fields.map(name=>[name,Number(form.elements[name].value)])));
   result.innerHTML=`<div class="credit-monthly"><span>Təxmini aylıq ödəniş</span><strong>${currency.format(data.monthly)}</strong></div><dl class="credit-summary">${[['Kredit məbləği',data.principal],['Ümumi faiz',data.interest],['Kredit üzrə cəmi ödəniş',data.repayment],['İlkin ödəniş daxil cəmi',data.total]].map(([label,value])=>`<div><dt>${label}</dt><dd>${currency.format(value)}</dd></div>`).join('')}</dl>${data.principal===0?'<p class="muted">Qiymət tam ödənilir, kredit məbləği qalmır.</p>':''}`;result.hidden=false;
  }catch(e){error.textContent=e.message;}
 }
 form.addEventListener('submit',event=>{event.preventDefault();update(true);});
 form.addEventListener('input',()=>update());
}
