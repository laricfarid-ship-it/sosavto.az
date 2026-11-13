export const escapeRental=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const rentalMoney=v=>new Intl.NumberFormat('az-AZ',{style:'currency',currency:'AZN',maximumFractionDigits:2}).format(Number(v)/100);
export const rentalDate=v=>String(v??'').slice(0,10);
export const rentalImage=v=>typeof v==='string'&&(/^(https:\/\/|\/media\/[a-f0-9-]+\.webp$)/.test(v))?v:'';
export async function rentalApi(path,method='GET',data){const r=await fetch('/api/rentacar/'+path,{method,headers:method==='GET'?{}:{'Content-Type':'application/json'},...(data?{body:JSON.stringify(data)}:{})});const b=await r.json();if(!r.ok)throw Error(b.error||'Sorğu alınmadı.');return b;}
export function rentalPanelStyles(doc=document){if(doc.querySelector('[data-rental-panel-css]'))return;const link=doc.createElement('link');link.rel='stylesheet';link.href='assets/rentacar-panels.css';link.dataset.rentalPanelCss='1';doc.head.append(link);}
export const rentalTabs=(items,active)=>items.map(([key,label])=>`<button type="button" role="tab" data-tab="${key}" aria-selected="${key===active}">${label}</button>`).join('');
export const rentalMetric=(number,label)=>`<div class="rp-metric"><strong>${escapeRental(number)}</strong><span>${escapeRental(label)}</span></div>`;
