import {quoteRental,rentalToday,rentalStatus} from './rentacar-shared.js';
const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>new Intl.NumberFormat('az-AZ',{style:'currency',currency:'AZN',maximumFractionDigits:2}).format(v/100);
const types={economy:'Ekonom',sedan:'Sedan',suv:'SUV / 4×4',premium:'Premium'};
const demo=[
 {id:'demo-porsche',listing_number:'DEMO-001',title:'Porsche Panamera',year:2023,city:'Bakı',vehicle_type:'premium',images:['assets/rentacar-porsche.jpg'],daily_cents:35000,weekly_cents:210000,monthly_cents:780000,deposit_cents:100000,owner_name:'Dizayn nümunəsi',owner_kind:'company',terms:'Yalnız dizayn nümunəsidir. Bu avtomobil real icarə elanı deyil və rezervasiya edilmir. Qiymətlər, depozit və şərtlər nümunədir.'},
 {id:'demo-mercedes',listing_number:'DEMO-002',title:'Mercedes-Benz',year:2022,city:'Bakı',vehicle_type:'premium',images:['assets/rentacar-mercedes.jpg'],daily_cents:22000,weekly_cents:135000,monthly_cents:520000,deposit_cents:70000,owner_name:'Dizayn nümunəsi',owner_kind:'company',terms:'Yalnız dizayn nümunəsidir. Bu avtomobil real icarə elanı deyil və rezervasiya edilmir. Qiymətlər, depozit və şərtlər nümunədir.'},
 {id:'demo-bmw',listing_number:'DEMO-003',title:'BMW',year:2021,city:'Sumqayıt',vehicle_type:'sedan',images:['assets/rentacar-bmw.jpg'],daily_cents:16000,weekly_cents:95000,monthly_cents:360000,deposit_cents:50000,owner_name:'Dizayn nümunəsi',owner_kind:'individual',terms:'Yalnız dizayn nümunəsidir. Bu avtomobil real icarə elanı deyil və rezervasiya edilmir. Qiymətlər, depozit və şərtlər nümunədir.'}
];
let enabled=false,cars=[],period='daily',account=null,selected=null,filtered=false;
const api=async(path,method='GET',data)=>{const r=await fetch('/api/rentacar/'+path,{method,headers:method==='GET'?{}:{'Content-Type':'application/json'},...(data?{body:JSON.stringify(data)}:{})});const b=await r.json();if(!r.ok)throw Error(b.error||'Sorğu alınmadı.');return b;};
const img=v=>typeof v==='string'&&(/^(https:\/\/|assets\/rentacar-[a-z]+\.jpg$)/.test(v))?v:'';
function renderCars(){
 $('#cars').innerHTML=cars.length?cars.map(c=>`<article class="car-card"><div class="car-picture"><img src="${esc(img(c.images[0]))}" alt="${esc(c.title)}" loading="lazy" width="800" height="485"><span class="badge">${enabled?'R-'+esc(c.listing_number):'DİZAYN NÜMUNƏSİ'}</span></div><div class="car-info"><span class="car-kicker">${esc(types[c.vehicle_type])} / ${esc(c.owner_kind==='company'?'ŞİRKƏT':'FƏRDİ SAHİB')}</span><h3>${esc(c.title)}</h3><div class="car-meta"><span>${esc(c.year)}</span><span>${esc(c.city)}</span><span>${esc(c.owner_name)}</span></div><div class="car-bottom"><div class="price"><strong>${money(c[period+'_cents'])}</strong> <span>/ ${period==='daily'?'gün':period==='weekly'?'həftə':'ay'}</span></div><button class="view-car" data-car="${esc(c.id)}">Ətraflı ↗</button></div></div></article>`).join(''):'<div class="empty">Seçilən şərtlərə uyğun avtomobil tapılmadı.</div>';
 $('#result-count').textContent=cars.length+' avtomobil'+(enabled?'':' · Dizayn nümunələri');
}
function datesValid(start,end){return start>=rentalToday()&&end>start&&(Date.parse(end)-Date.parse(start))/86400000<=365;}
async function search(){
 const f=$('#searchForm').elements,start=f.start.value,end=f.end.value;
 if(!datesValid(start,end)){ $('#result-count').textContent='Gələcək tarixlərdə 1–365 günlük müddət seçin.';return;}
 const p=new URLSearchParams({start,end});if(f.city.value)p.set('city',f.city.value);if(f.vehicle_type.value)p.set('vehicle_type',f.vehicle_type.value);
 try{cars=enabled?(await api('cars?'+p)).cars:demo.filter(c=>(!f.city.value||c.city===f.city.value)&&(!f.vehicle_type.value||c.vehicle_type===f.vehicle_type.value));filtered=true;renderCars();$('#fleet').scrollIntoView({behavior:'smooth'});}catch(e){$('#result-count').textContent=e.message;}
}
$('#searchForm').addEventListener('submit',e=>{e.preventDefault();search();});
$('#pickup').min=rentalToday();$('#dropoff').min=rentalToday();
$('#pickup').addEventListener('change',()=>{$('#dropoff').min=$('#pickup').value||rentalToday();if($('#dropoff').value<=$('#pickup').value)$('#dropoff').value='';});
document.querySelectorAll('[data-period]').forEach(b=>b.addEventListener('click',()=>{period=b.dataset.period;document.querySelectorAll('[data-period]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));renderCars();}));
$('#reset-search').addEventListener('click',async()=>{ $('#searchForm').reset();$('#dropoff').min=rentalToday();filtered=false;try{cars=enabled?(await api('cars')).cars:demo;renderCars();}catch(e){$('#result-count').textContent=e.message;} });
$('#cars').addEventListener('click',e=>{const b=e.target.closest('[data-car]');if(b)openCar(cars.find(c=>c.id===b.dataset.car));});
$('#detail-close').addEventListener('click',()=>$('#car-dialog').close());
$('#car-dialog').addEventListener('click',e=>{if(e.target===$('#car-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
async function user(){if(!enabled)return null;const r=await fetch('/api/me');if(!r.ok)throw Error('Hesab məlumatları alınmadı.');account=(await r.json()).user;return account;}
function openCar(c){
 selected=c;const f=$('#searchForm').elements,link=new URL('rentacar.html',location.href);link.searchParams.set('car',c.id);
 $('#detail').innerHTML=`<img class="detail-photo" src="${esc(img(c.images[0]))}" alt="${esc(c.title)}"><div class="detail-body"><p class="eyebrow">${enabled?'ELAN R-'+esc(c.listing_number):'DİZAYN NÜMUNƏSİ · '+esc(c.listing_number)}</p><h2 id="detail-title">${esc(c.title)}</h2><p>${esc(c.year)} · ${esc(c.city)} · ${esc(types[c.vehicle_type])}</p><div class="photo-thumbs">${c.images.map((v,i)=>`<button data-photo="${i}" aria-label="Şəkil ${i+1}"><img src="${esc(img(v))}" alt=""></button>`).join('')}</div><div class="detail-prices">${[['daily','Günlük'],['weekly','Həftəlik'],['monthly','Aylıq']].map(([k,label])=>`<div>${label}<strong>${money(c[k+'_cents'])}</strong></div>`).join('')}</div><h3>İcarə şərtləri</h3><p>${esc(c.terms)}</p><p>Depozit: <strong>${money(c.deposit_cents)}</strong> · Depozit icarə haqqına daxil deyil.</p><p>Sahib: ${enabled&&c.owner_kind==='company'?`<a href="rentacar.html?company=${esc(c.owner_id)}">${esc(c.owner_name)} ↗</a>`:esc(c.owner_name)}${enabled?' · <a href="tel:'+esc(c.owner_phone)+'">Zəng et</a>':''}</p><label>Elanın keçidi<input value="${esc(link.href)}" readonly aria-label="Elanın keçidi"></label><form class="booking-form"><label>Götürmə tarixi<input name="start" type="date" min="${rentalToday()}" value="${esc(f.start.value)}" required></label><label>Qaytarma tarixi<input name="end" type="date" min="${rentalToday()}" value="${esc(f.end.value)}" required></label><div class="wide booking-summary" role="status">Məbləği hesablamaq üçün tarix seçin.</div><button class="silver-button wide" type="submit" ${enabled?'':'disabled'}>${enabled?'Rezervasiya sorğusu göndər ↗':'Real rezervasiya aktiv deyil'}</button><p role="status" class="booking-status">${enabled?'Sorğu göndərmək ödəniş və ya təsdiqlənmiş rezervasiya deyil. Sahibin təsdiqi tələb olunur.':'Bu avtomobil və qiymətlər dizayn nümunəsidir. Hesablanan məbləğ sifariş yaratmır.'}</p></form></div>`;
 $('#detail').querySelectorAll('[data-photo]').forEach(b=>b.onclick=()=>{$('#detail .detail-photo').src=img(c.images[Number(b.dataset.photo)]);});
 const form=$('#detail form'),summary=form.querySelector('.booking-summary'),status=form.querySelector('.booking-status');let total=null,key=crypto.randomUUID();
 const update=()=>{const a=form.elements.start.value,b=form.elements.end.value;total=null;if(!datesValid(a,b)){summary.textContent='Qaytarma tarixi götürmə tarixindən sonra olmalıdır (1–365 gün).';return;}const days=(Date.parse(b)-Date.parse(a))/86400000;total=quoteRental(c,days);summary.textContent=`${days} gün · İcarə haqqı: ${money(total)} · Ayrıca depozit: ${money(c.deposit_cents)}${enabled?'':' · Nümunə hesablaması'}`;};
 form.addEventListener('input',()=>{key=crypto.randomUUID();update();});update();
 form.addEventListener('submit',async e=>{e.preventDefault();if(!enabled||total===null)return;const button=form.querySelector('button');button.disabled=true;try{if(!await user()){status.innerHTML='<a href="giris.html?next='+encodeURIComponent('/rentacar.html?car='+c.id)+'">Sorğu üçün hesabınıza daxil olun ↗</a>';return;}const r=await api('bookings','POST',{car_id:c.id,starts_on:form.elements.start.value,ends_on:form.elements.end.value,client_key:key,expected_total_cents:total});status.textContent='Sorğu saxlanıldı. Status: '+rentalStatus[r.booking.status]+'. Sahibin təsdiqini gözləyin.';}catch(e){status.textContent=e.message;}finally{button.disabled=false;}});
 if(!$('#car-dialog').open)$('#car-dialog').showModal();
}
const field=(label,name,type='text',extra='')=>`<label>${label}<input name="${name}" type="${type}" ${extra} required></label>`;
const row=(title,body)=>`<article class="panel-row"><strong>${esc(title)}</strong><p>${body}</p></article>`;
const actionButtons=b=>{const manager=b._manager;return `<div class="panel-actions">${(b.status==='pending'?(manager?[['confirm','Təsdiqlə'],['reject','Rədd et'],['cancel','Ləğv et']]:[['cancel','Ləğv et']]):b.status==='confirmed'?(manager?[['cancel','Ləğv et'],['complete','Tamamla']]:[['cancel','Ləğv et']]):[]).map(([a,label])=>`<button data-booking="${esc(b.id)}" data-action="${a}">${label}</button>`).join('')}</div>`;};
async function workspace(){
 const pane=$('#workspace'),content=$('#workspace-content');pane.hidden=false;pane.focus();pane.scrollIntoView({behavior:'smooth'});
 if(!enabled){content.innerHTML='<div class="panel-row"><h3>Test önizləməsi</h3><p>Şirkət/fərdi sahib profili, elan göndərmə və rezervasiya idarəetməsi üçün ayrıca test bazası hələ aktiv deyil. Burada məlumat və sənəd qəbul edilmir.</p></div>';return;}
 content.textContent='Yüklənir…';
 try{
  if(!await user()){content.innerHTML='<p><a href="giris.html?next='+encodeURIComponent('/rentacar.html?panel=1')+'">İcarə paneli üçün daxil ol ↗</a></p>';return;}
  const [owner,bookings]=await Promise.all([api('owner'),api('bookings')]);
  content.innerHTML='<p id="workspace-status" role="status"></p>';
  if(!owner.profile)content.innerHTML+=`<h3>İcarə tərəfdaşı kimi qeydiyyat</h3><p>Profil admin yoxlamasından sonra aktivləşir. Bu formaya şəxsiyyət sənədi yükləməyin.</p><form class="rental-form" id="profile-form"><label>Hesab tipi<select name="kind"><option value="company">İcarə şirkəti</option><option value="individual">Fərdi avtomobil sahibi</option></select></label>${field('Şirkət adı / ad və soyad','name','text','maxlength="120"')}${field('Şəhər','city','text','maxlength="80"')}${field('Telefon','phone','tel','maxlength="25"')}<button class="silver-button">Yoxlamaya göndər ↗</button></form>`;
  else{
   content.innerHTML+=row(owner.profile.name,esc(owner.profile.kind==='company'?'İcarə şirkəti':'Fərdi sahib')+' · '+esc(rentalStatus[owner.profile.status])+'<br>'+esc(owner.profile.review_note)+(owner.profile.kind==='company'&&owner.profile.status==='approved'?'<br><a href="rentacar.html?company='+esc(owner.profile.user_id)+'">Şirkətin açıq profilinə bax ↗</a>':''));
   if(owner.profile.status==='approved')content.innerHTML+=`<h3>Yeni icarə elanı</h3><form class="rental-form" id="car-form">${field('Avtomobilin adı','title','text','maxlength="120"')}${field('Şəhər','city','text','maxlength="80"')}<label>Sinif<select name="vehicle_type">${Object.entries(types).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label>${field('Buraxılış ili','year','number','min="1900" max="'+(new Date().getFullYear()+1)+'"')}${field('Günlük (AZN)','daily','number','min="0.01" step="0.01"')}${field('Həftəlik (AZN)','weekly','number','min="0.01" step="0.01"')}${field('Aylıq (AZN)','monthly','number','min="0.01" step="0.01"')}${field('Depozit (AZN)','deposit','number','min="0" step="0.01"')}<label class="wide">Şəkillərin HTTPS linkləri (hər sətirdə bir, 1–12 ədəd)<textarea name="images" rows="3" required></textarea></label><label class="wide">İcarə şərtləri: minimum yaş/təcrübə, yürüş limiti, təhvil ünvanı, sığorta, ləğv qaydası<textarea name="terms" minlength="20" maxlength="3000" rows="5" required></textarea></label><button class="silver-button wide">Elanı yoxlamaya göndər ↗</button></form>`;
   content.innerHTML+='<h3>Avtomobillərim</h3>'+(owner.cars.map(c=>row(c.title,'R-'+esc(c.listing_number)+' · '+esc(rentalStatus[c.status])+' · '+money(c.daily_cents)+' / gün')).join('')||'<p>Hələ elan yoxdur.</p>')+'<h3>Gələn rezervasiya sorğuları</h3>'+(owner.bookings.map(b=>row(b.title,esc(b.starts_on)+' → '+esc(b.ends_on)+' · '+esc(rentalStatus[b.status])+' · '+money(b.total_cents)+actionButtons({...b,_manager:true}))).join('')||'<p>Hələ sorğu yoxdur.</p>');
  }
  content.innerHTML+='<h3>Göndərdiyim rezervasiyalar</h3>'+(bookings.bookings.map(b=>row(b.title,esc(b.starts_on)+' → '+esc(b.ends_on)+' · '+esc(rentalStatus[b.status])+' · '+money(b.total_cents)+actionButtons(b))).join('')||'<p>Hələ rezervasiya yoxdur.</p>');
  if(account.role==='admin'){const admin=document.createElement('div');content.append(admin);await (await import('./rentacar-admin.js')).mountRentalAdmin(admin);}
  const status=$('#workspace-status');
  $('#profile-form')?.addEventListener('submit',async e=>{e.preventDefault();const f=e.target;await save(f,()=>api('profile','POST',Object.fromEntries(new FormData(f))),status);});
  $('#car-form')?.addEventListener('submit',async e=>{e.preventDefault();const f=e.target,b=Object.fromEntries(new FormData(f));await save(f,()=>api('cars','POST',{title:b.title,city:b.city,vehicle_type:b.vehicle_type,year:Number(b.year),images:b.images.split(/\r?\n/).map(x=>x.trim()).filter(Boolean),terms:b.terms,...Object.fromEntries(['daily','weekly','monthly','deposit'].map(k=>[k+'_cents',Math.round(Number(b[k])*100)]))}),status);});
 }catch(e){content.textContent=e.message;}
}
async function save(form,fn,status){const button=form.querySelector('button');button.disabled=true;try{await fn();await workspace();$('#workspace-status').textContent='Sorğu saxlanıldı. Admin yoxlamasını gözləyin.';}catch(e){status.textContent=e.message;}finally{button.disabled=false;}}
$('#workspace-content').addEventListener('click',async e=>{const b=e.target.closest('[data-booking]');if(!b)return;b.disabled=true;try{await api('bookings/'+b.dataset.booking+'/'+b.dataset.action,'POST',{});await workspace();}catch(e){$('#workspace-status').textContent=e.message;}finally{b.disabled=false;}});
$('#workspace-open').addEventListener('click',workspace);$('#partner-open').addEventListener('click',workspace);$('#workspace-close').onclick=()=>{$('#workspace').hidden=true;$('#workspace-open').focus();};
async function init(){
 try{
  enabled=(await api('config')).enabled;
  $('#mode').textContent=enabled?'Test mühiti · Rezervasiya sorğuları sahibin təsdiqindən sonra qüvvəyə minir. Ödəniş qəbul edilmir.':'Dizayn önizləməsi · Avtomobillər və qiymətlər nümunədir. Axtarışı, tarixləri və qiymət hesablamasını yoxlaya bilərsiniz. Real rezervasiya qəbul edilmir.';
  const p=new URLSearchParams(location.search);
  if(enabled&&p.has('company')){const d=await api('profiles/'+encodeURIComponent(p.get('company')));cars=d.cars.map(c=>({...c,owner_name:d.profile.name,owner_kind:'company',owner_phone:d.profile.phone}));$('#fleet h2').textContent=d.profile.name;$('#fleet .eyebrow').textContent='İCARƏ ŞİRKƏTİ · '+d.profile.city;}
  else cars=enabled?(await api('cars')).cars:demo;
  renderCars();
  if(p.has('car')){const c=enabled?(await api('cars/'+encodeURIComponent(p.get('car')))).car:demo.find(c=>c.id===p.get('car'));if(c)openCar(c);}
  if(p.has('panel'))await workspace();
 }catch(e){$('#mode').textContent='Önizləmə yüklənmədi: '+e.message;$('#cars').innerHTML='<div class="empty">Məlumat alınmadı. Səhifəni yeniləyib təkrar yoxlayın.</div>';$('#result-count').textContent='Yükləmə xətası';}
}
init();
