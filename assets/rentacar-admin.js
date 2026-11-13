import {rentalStatus} from './rentacar-shared.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function mountRentalAdmin(pane){
 const api=async(path,method='GET',data)=>{const r=await fetch('/api/rentacar/'+path,{method,headers:method==='GET'?{}:{'Content-Type':'application/json'},...(data?{body:JSON.stringify(data)}:{})});const b=await r.json();if(!r.ok)throw Error(b.error||'Sorğu alınmadı.');return b;};
 const config=await api('config');
 pane.innerHTML='<h2>Rent a Car idarəetməsi</h2><p data-rental-status role="status"></p><div data-rental-data></div>';
 const status=pane.querySelector('[data-rental-status]'),content=pane.querySelector('[data-rental-data]');
 if(!config.enabled){status.textContent='Rent a Car test önizləməsidir. Ayrı test bazası aktivləşdirilməyib; real elan və rezervasiya qəbul edilmir.';content.innerHTML='<a href="rentacar.html" target="_blank" rel="noopener noreferrer">Dizayn önizləməsinə bax ↗</a>';return;}
 async function refresh(){
  const d=await api('admin');
  const row=(x,body)=>'<article class="panel-row"><strong>'+esc(x.name||x.title||x.id)+'</strong><p>'+body+'</p></article>';
  const buttons=(kind,id,items)=>items.map(([action,label])=>'<button type="button" data-kind="'+kind+'" data-id="'+esc(id)+'" data-action="'+action+'">'+label+'</button>').join(' ');
  content.innerHTML='<h3>Sahib yoxlamaları</h3>'+d.profiles.map(p=>row(p,esc(p.kind==='company'?'Şirkət':'Fərdi sahib')+' · '+esc(p.city)+' · '+esc(p.phone)+' · '+esc(rentalStatus[p.status])+'<br>'+esc(p.review_note)+'<br>'+buttons('profiles',p.user_id,[['approved','Təsdiqlə'],['rejected','Rədd et']]))).join('')+'<h3>İcarə elanları</h3>'+d.cars.map(c=>row(c,'R-'+esc(c.listing_number)+' · '+esc(c.owner_name)+' · '+esc(rentalStatus[c.status])+'<br>'+buttons('cars',c.id,[['active','Dərc et'],['rejected','Rədd et'],['archived','Arxivlə']]))).join('')+'<h3>Rezervasiyalar</h3>'+d.bookings.map(b=>row(b,esc(b.starts_on)+' → '+esc(b.ends_on)+' · '+esc(rentalStatus[b.status])+'<br>'+buttons('bookings',b.id,b.status==='pending'?[['confirm','Təsdiqlə'],['reject','Rədd et']]:b.status==='confirmed'?[['cancel','Ləğv et'],['complete','Tamamla']]:[]))).join('')+'<h3>Əməliyyat tarixçəsi</h3>'+d.audit.map(a=>row(a,esc(a.action)+' · '+esc(a.created_at)+' · '+esc(JSON.stringify(a.detail)))).join('');
 }
 content.addEventListener('click',async e=>{
  const b=e.target.closest('[data-kind]');if(!b)return;b.disabled=true;
  try{
   if(b.dataset.kind==='bookings')await api('bookings/'+b.dataset.id+'/'+b.dataset.action,'POST',{});
   else{
    const note=window.prompt('Yoxlama qeydi: sənədləri və icarəyə vermə səlahiyyətini necə yoxladınız? Şəxsi sənəd nömrəsi yazmayın.');if(note===null)return;
    await api('admin/'+b.dataset.kind+'/'+b.dataset.id,'PATCH',{status:b.dataset.action,note});
   }
   status.textContent='Əməliyyat saxlanıldı.';await refresh();
  }catch(e){status.textContent=e.message;}finally{b.disabled=false;}
 });
 await refresh();
}
