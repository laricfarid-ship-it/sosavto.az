// Pure presentation helpers. No provider, account or database configuration.
const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const bodyTypes=['Sedan','SUV','Hetçbek','Universal','Kupe','Pikap','Miniven'];
const silhouettes=[
 'M4 26V21L15 18 23 10H40L49 19 59 22V29H53M17 29H43M4 29H7M25 13H38L44 19H19Z',
 'M4 29V16L12 9H42L51 18H59V29H53M17 29H43M4 29H7M15 12H27V19H9M30 12H40L46 19H30Z',
 'M4 29V19L14 10H35L47 20 58 23V29H53M17 29H43M4 29H7M17 13H33L40 20H10Z',
 'M4 29V17L10 10H39L49 20 59 23V29H53M17 29H43M4 29H7M13 13H26V20H8M29 13H38L43 20H29Z',
 'M4 29V23L14 20 29 11H40L49 20 59 24V29H53M17 29H43M4 29H7M29 14H39L44 20H20Z',
 'M4 29V16H27V9H42L50 19H59V29H53M17 29H43M4 29H7M30 12H40L45 19H30Z',
 'M4 29V15Q4 8 12 8H41L52 18 59 23V29H53M17 29H43M4 29H7M11 12H25V20H8M28 12H39L46 20H28Z'
];
export function bodyChoices(selected=''){
 return `<fieldset class="body-choices"><legend>Kuzov tipinə görə seç</legend><div class="body-options">${bodyTypes.map((name,i)=>`<button type="button" class="body-choice" data-body="${name}" aria-pressed="${selected===name}"><svg viewBox="0 0 64 40" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="${silhouettes[i]}"/><circle cx="12" cy="29" r="5"/><circle cx="48" cy="29" r="5"/></svg><span>${name}</span></button>`).join('')}</div></fieldset>`;
}
const labels={q:'Axtarış',brand:'Marka',model:'Model',city:'Şəhər',fuel:'Yanacaq',transmission:'Sürətlər qutusu',body:'Kuzov',condition:'Vəziyyət',drive:'Ötürücü',color:'Rəng',mileage_max:'Maksimum yürüş',part_type:'Detal',oem:'OEM',insurance_type:'Sığorta',insurer:'Şirkət',plate_region:'Region',plate_letters:'Hərflər',plate_digits:'Rəqəmlər',service_type:'Xidmət'};
export function filterChips(params){
 const chips=[],add=(keys,label)=>chips.push({keys,label});
 for(const [lo,hi,label,unit] of [['price_min','price_max','Qiymət',' ₼'],['year_min','year_max','İl','']]){
  const a=params.get(lo),b=params.get(hi);
  if(a||b)add([lo,hi],`${label}: ${a&&b?a+'–'+b:a?a+' və yuxarı':b+' və aşağı'}${unit}`);
 }
 for(const [key,label] of Object.entries(labels))if(params.get(key))add(key==='brand'?['brand','model']:[key],`${label}: ${params.get(key)}${key==='mileage_max'?' km':''}`);
 for(const [key,label]of [['credit','Kredit mümkündür'],['barter','Barter mümkündür']])if(params.get(key)==='true')add([key],label);
 return chips;
}
export function removedFilterURL(params,keys){
 const next=new URLSearchParams(params);for(const key of keys)next.delete(key);next.delete('page');
 return 'index.html?'+next;
}
export function chipMarkup(params){
 const chips=filterChips(params);
 return chips.length?`<div class="filter-chips" aria-label="Aktiv filtrlər">${chips.map(c=>`<a class="filter-chip" href="${escape(removedFilterURL(params,c.keys))}" aria-label="${escape(c.label)} filtrini sil">${escape(c.label)} <span aria-hidden="true">×</span></a>`).join('')}</div>`:'';
}
export function comparisonIds(value){
 return [...new Set((Array.isArray(value)?value:[]).filter(id=>typeof id==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(id)))].slice(0,3);
}
export function vehicleHighlights(l,esc=escape){
 if(l.category!=='car')return '';
 const fields=[['İl',l.year],['Yürüş',l.mileage==null?'':Number(l.mileage).toLocaleString('az-AZ')+' km'],['Yanacaq',l.details?.fuel],['Sürətlər qutusu',l.details?.transmission]];
 return `<section class="vehicle-highlights" aria-label="Əsas texniki göstəricilər">${fields.map(([label,value])=>`<div><span>${label}</span><strong>${esc(value||'Qeyd edilməyib')}</strong></div>`).join('')}</section>`;
}
