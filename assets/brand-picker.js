import {brandLogos} from './brand-logos.js';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function logoMarkup(brand){
 const i=brandLogos[brand];
 return i===undefined?`<span class="brand-logo brand-initials" aria-hidden="true">${escape(brand.slice(0,2).toUpperCase())}</span>`:`<span class="brand-logo" aria-hidden="true"><span style="background-position:-${i%12*48}px -${Math.floor(i/12)*36}px"></span></span>`;
}
export function mountBrandPicker(select){
 const doc=select.ownerDocument;
 // Keep the native select as the form's canonical value and fallback.
 if(typeof doc.createElement('dialog').showModal!=='function')return null;
 const trigger=doc.createElement('button');trigger.type='button';trigger.className='brand-picker-trigger';trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-expanded','false');
 select.after(trigger);select.hidden=true;
 const dialog=doc.createElement('dialog');dialog.className='brand-picker-dialog';dialog.setAttribute('aria-label','Marka seçin');
 dialog.innerHTML='<div class="brand-picker-heading"><div><p class="eyebrow">Avtomobil markaları</p><h2>Markanı seç</h2></div><button type="button" class="btn" aria-label="Marka seçimini bağla">✕</button></div><label class="field">Marka axtar<input type="search" placeholder="Məsələn, BMW, Toyota, BYD…" autocomplete="off"></label><div class="brand-picker-list" aria-label="Markalar"></div><p class="brand-picker-empty" role="status" hidden>Uyğun marka tapılmadı. “Digər” seçimi ilə əl ilə yaza bilərsiniz.</p><button type="button" class="btn brand-picker-other">Digər — əl ilə yaz</button>';
 doc.body.append(dialog);
 const search=dialog.querySelector('input'),list=dialog.querySelector('.brand-picker-list'),empty=dialog.querySelector('.brand-picker-empty');
 const normalize=s=>s.toLocaleLowerCase('az').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i');
 function sync(){const option=select.selectedOptions[0];trigger.disabled=select.disabled;trigger.innerHTML=(select.value&&select.value!=='__other__'?logoMarkup(select.value):'')+`<span>${escape(option?.textContent||'Marka seçin')}</span><span class="brand-picker-chevron" aria-hidden="true">⌄</span>`;trigger.setAttribute('aria-label','Marka: '+(option?.textContent||'Marka seçin'));}
 function choose(value){select.value=value;select.dispatchEvent(new doc.defaultView.Event('change',{bubbles:true}));sync();dialog.close();}
 function render(){const term=normalize(search.value.trim());const options=[...select.options].filter(o=>o.value!=='__other__'&&(!term||normalize(o.textContent).includes(term)));list.innerHTML=options.map(o=>`<button type="button" class="brand-picker-option ${select.value===o.value?'selected':''}" data-value="${escape(o.value)}" aria-pressed="${select.value===o.value}">${o.value?logoMarkup(o.value):'<span class="brand-logo brand-initials" aria-hidden="true">—</span>'}<span>${escape(o.textContent)}</span>${select.value===o.value?'<span class="brand-picker-tick" aria-hidden="true">✓</span>':''}</button>`).join('');empty.hidden=options.length>0;list.querySelectorAll('button').forEach(b=>b.onclick=()=>choose(b.dataset.value));}
 trigger.onclick=()=>{if(select.disabled)return;search.value='';render();dialog.showModal();trigger.setAttribute('aria-expanded','true');search.focus();};
 dialog.querySelector('[aria-label="Marka seçimini bağla"]').onclick=()=>dialog.close();dialog.querySelector('.brand-picker-other').onclick=()=>choose('__other__');
 dialog.addEventListener('close',()=>{trigger.setAttribute('aria-expanded','false');trigger.focus();});dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
 search.oninput=render;search.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();list.querySelector('button')?.click();}if(e.key==='ArrowDown'){e.preventDefault();list.querySelector('button')?.focus();}};
 list.onkeydown=e=>{if(!['ArrowDown','ArrowUp','Home','End'].includes(e.key))return;const buttons=[...list.querySelectorAll('button')],i=buttons.indexOf(doc.activeElement);e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?buttons.length-1:Math.max(0,Math.min(buttons.length-1,i+(e.key==='ArrowDown'?1:-1)));buttons[next]?.focus();};
 select.addEventListener('change',sync);sync();return {sync};
}
