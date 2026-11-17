import {mountRentalWorkspace} from './rentacar-workspace.js';
import {quoteRental,rentalToday,rentalStatus} from './rentacar-shared.js';
const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>new Intl.NumberFormat('az-AZ',{style:'currency',currency:'AZN',maximumFractionDigits:2}).format(v/100);
const types={economy:'Ekonom',sedan:'Sedan',suv:'SUV / 4×4',premium:'Premium'};
const demo=[
 {id:'demo-porsche',listing_number:'DEMO-001',title:'Porsche Panamera',year:2023,city:'Bakı',vehicle_type:'premium',images:['assets/rentacar-porsche.jpg'],daily_cents:35000,weekly_cents:210000,monthly_cents:780000,deposit_cents:100000,owner_name:'Dizayn nümunəsi',owner_kind:'company',terms:'Yalnız dizayn nümunəsidir. Bu avtomobil real icarə elanı deyil və rezervasiya edilmir. Qiymətlər, depozit və şərtlər nümunədir.'},
 {id:'demo-mercedes',listing_number:'DEMO-002',title:'Mercedes-Benz',year:2022,city:'Bakı',vehicle_type:'premium',images:['assets/rentacar-mercedes.jpg'],daily_cents:22000,weekly_cents:135000,monthly_cents:520000,deposit_cents:70000,owner_name:'Dizayn nümunəsi',owner_kind:'company',terms:'Yalnız dizayn nümunəsidir. Bu avtomobil real icarə elanı deyil və rezervasiya edilmir. Qiymətlər, depozit və şərtlər nümunədir.'},
 {id:'demo-bmw',listing_number:'DEMO-003',title:'BMW',year:2021,city:'Sumqayıt',vehicle_type:'sedan',images:['assets/rentacar-bmw.jpg'],daily_cents:16000,weekly_cents:95000,monthly_cents:360000,deposit_cents:50000,owner_name:'Dizayn nümunəsi',owner_kind:'individual',terms:'Yalnız dizayn nümunəsidir. Bu avtomobil real icarə elanı deyil və rezervasiya edilmir. Qiymətlər, depozit və şərtlər nümunədir.'}
];
let live=false,enabled=false,cars=[],period='daily',account=null,selected=null,filtered=false;
let carPage=1,carTotal=0,companyPage=1,companyTotal=0,companies=[],activeQuery=new URLSearchParams();
const companyId=new URLSearchParams(location.search).get('company');
const api=async(path,method='GET',data)=>{const r=await fetch('/api/rentacar/'+path,{method,headers:method==='GET'?{}:{'Content-Type':'application/json'},...(data?{body:JSON.stringify(data)}:{})});const b=await r.json();if(!r.ok)throw Error(b.error||'Sorğu alınmadı.');return b;};
const img=v=>typeof v==='string'&&(/^(https:\/\/|\/media\/[a-f0-9-]+\.webp$|assets\/rentacar-[a-z]+\.jpg$)/.test(v))?v:'';
function renderCars(){
 $('#cars').innerHTML=cars.length?cars.map(c=>`<article class="car-card"><div class="car-picture"><img src="${esc(img(c.images[0]))}" alt="${esc(c.title)}" loading="lazy" width="800" height="485"><span class="badge">${enabled?'R-'+esc(c.listing_number):'DİZAYN NÜMUNƏSİ'}</span></div><div class="car-info"><span class="car-kicker">${esc(types[c.vehicle_type])} / ${esc(c.owner_kind==='company'?'ŞİRKƏT':'FƏRDİ SAHİB')}</span><h3>${esc(c.title)}</h3><div class="car-meta"><span>${esc(c.year)}</span><span>${esc(c.city)}</span><span>${enabled&&c.owner_kind==='company'?`<a class="owner-link" href="rentacar.html?company=${esc(c.owner_id)}">${esc(c.owner_name)} ↗</a>`:esc(c.owner_name)}</span></div><div class="car-bottom"><div class="price"><strong>${money(c[period+'_cents'])}</strong> <span>/ ${period==='daily'?'gün':period==='weekly'?'həftə':'ay'}</span></div><button class="view-car" data-car="${esc(c.id)}">Ətraflı ↗</button></div></div></article>`).join(''):'<div class="empty">Seçilən şərtlərə uyğun avtomobil tapılmadı.</div>';
 $('#more-cars').hidden=!enabled||cars.length>=carTotal;
 $('#result-count').textContent=cars.length+(enabled?' / '+carTotal:'')+' avtomobil'+(enabled?'':' · Dizayn nümunələri');
}
function datesValid(start,end){return start>=rentalToday()&&end>start&&(Date.parse(end)-Date.parse(start))/86400000<=365;}
async function search(){
 const f=$('#searchForm').elements,start=f.start.value,end=f.end.value;
 if(!datesValid(start,end)){ $('#result-count').textContent='Gələcək tarixlərdə 1–365 günlük müddət seçin.';return;}
 const p=new URLSearchParams({start,end});if(companyId&&enabled)p.set('owner_id',companyId);if(f.city.value)p.set('city',f.city.value);if(f.vehicle_type.value)p.set('vehicle_type',f.vehicle_type.value);
 try{if(enabled){activeQuery=p;await loadCars();}else cars=demo.filter(c=>(!f.city.value||c.city===f.city.value)&&(!f.vehicle_type.value||c.vehicle_type===f.vehicle_type.value));filtered=true;renderCars();$('#fleet').scrollIntoView({behavior:'smooth'});}catch(e){$('#result-count').textContent=e.message;}
}
$('#searchForm').addEventListener('submit',e=>{e.preventDefault();search();});
$('#pickup').min=rentalToday();$('#dropoff').min=rentalToday();
$('#pickup').addEventListener('change',()=>{$('#dropoff').min=$('#pickup').value||rentalToday();if($('#dropoff').value<=$('#pickup').value)$('#dropoff').value='';});
document.querySelectorAll('[data-period]').forEach(b=>b.addEventListener('click',()=>{period=b.dataset.period;document.querySelectorAll('[data-period]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));renderCars();}));
$('#reset-search').addEventListener('click',async()=>{ $('#searchForm').reset();$('#dropoff').min=rentalToday();filtered=false;try{if(enabled){activeQuery=new URLSearchParams(companyId?{owner_id:companyId}:{});await loadCars();}else cars=demo;renderCars();}catch(e){$('#result-count').textContent=e.message;} });
$('#cars').addEventListener('click',e=>{const b=e.target.closest('[data-car]');if(b)openCar(cars.find(c=>c.id===b.dataset.car));});
$('#detail-close').addEventListener('click',()=>$('#car-dialog').close());
$('#car-dialog').addEventListener('click',e=>{if(e.target===$('#car-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
async function user(){if(!enabled)return null;const r=await fetch('/api/me');if(!r.ok)throw Error('Hesab məlumatları alınmadı.');account=(await r.json()).user;return account;}
function openCar(c){
 selected=c;const f=$('#searchForm').elements,link=new URL('rentacar.html',location.href);link.searchParams.set('car',c.id);
 $('#detail').innerHTML=`<img class="detail-photo" src="${esc(img(c.images[0]))}" alt="${esc(c.title)}"><div class="detail-body"><p class="eyebrow">${enabled?'ELAN R-'+esc(c.listing_number):'DİZAYN NÜMUNƏSİ · '+esc(c.listing_number)}</p><h2 id="detail-title">${esc(c.title)}</h2><p>${esc(c.year)} · ${esc(c.city)} · ${esc(types[c.vehicle_type])}</p><div class="photo-thumbs">${c.images.map((v,i)=>`<button data-photo="${i}" aria-label="Şəkil ${i+1}"><img src="${esc(img(v))}" alt=""></button>`).join('')}</div><div class="detail-prices">${[['daily','Günlük'],['weekly','Həftəlik'],['monthly','Aylıq']].map(([k,label])=>`<div>${label}<strong>${money(c[k+'_cents'])}</strong></div>`).join('')}</div><p data-calendar role="status"></p><h3>İcarə şərtləri</h3><p>${esc(c.terms)}</p><p>Depozit: <strong>${money(c.deposit_cents)}</strong> · Depozit icarə haqqına daxil deyil.</p><p>Sahib: ${enabled&&c.owner_kind==='company'?`<a href="rentacar.html?company=${esc(c.owner_id)}">${esc(c.owner_name)} ↗</a>`:esc(c.owner_name)}${enabled?' · <a href="tel:'+esc(c.owner_phone)+'">Zəng et</a>':''}</p><label>Elanın keçidi<input value="${esc(link.href)}" readonly aria-label="Elanın keçidi"></label><form class="booking-form"><label>Götürmə tarixi<input name="start" type="date" min="${rentalToday()}" value="${esc(f.start.value)}" required></label><label>Qaytarma tarixi<input name="end" type="date" min="${rentalToday()}" value="${esc(f.end.value)}" required></label><label class="wide">Əlaqə telefonu<input name="phone" type="tel" minlength="9" maxlength="25" placeholder="+994…" required></label><div class="wide booking-summary" role="status">Məbləği hesablamaq üçün tarix seçin.</div><button class="silver-button wide" type="submit" ${enabled?'':'disabled'}>${enabled?'Rezervasiya sorğusu göndər ↗':'Real rezervasiya aktiv deyil'}</button><p role="status" class="booking-status">${enabled?'Sorğu göndərmək ödəniş və ya təsdiqlənmiş rezervasiya deyil. Sahibin təsdiqi tələb olunur. İcarə haqqı və depozit sahibə ayrıca ödənilir; sayt kart ödənişi qəbul etmir.':'Bu avtomobil və qiymətlər dizayn nümunəsidir. Hesablanan məbləğ sifariş yaratmır.'}</p></form></div>`;
 $('#detail').querySelectorAll('[data-photo]').forEach(b=>b.onclick=()=>{$('#detail .detail-photo').src=img(c.images[Number(b.dataset.photo)]);});
 const form=$('#detail form'),summary=form.querySelector('.booking-summary'),status=form.querySelector('.booking-status');let total=null,key=crypto.randomUUID();
 const update=()=>{const a=form.elements.start.value,b=form.elements.end.value;total=null;if(!datesValid(a,b)){summary.textContent='Qaytarma tarixi götürmə tarixindən sonra olmalıdır (1–365 gün).';return;}const days=(Date.parse(b)-Date.parse(a))/86400000;total=quoteRental(c,days);summary.textContent=`${days} gün · İcarə haqqı: ${money(total)} · Ayrıca depozit: ${money(c.deposit_cents)}${enabled?'':' · Nümunə hesablaması'}`;};
 form.addEventListener('input',()=>{key=crypto.randomUUID();update();});update();
 form.addEventListener('submit',async e=>{e.preventDefault();if(!enabled||total===null)return;const button=form.querySelector('button');button.disabled=true;try{if(!await user()){status.innerHTML='<a href="giris.html?next='+encodeURIComponent('/rentacar.html?car='+c.id)+'">Sorğu üçün hesabınıza daxil olun ↗</a>';return;}const r=await api('bookings','POST',{car_id:c.id,starts_on:form.elements.start.value,ends_on:form.elements.end.value,client_key:key,expected_total_cents:total,phone:form.elements.phone.value});status.textContent='Sorğu saxlanıldı. Status: '+rentalStatus[r.booking.status]+'. Sahibin təsdiqini gözləyin.';}catch(e){status.textContent=e.message;}finally{button.disabled=false;}});
 if(enabled)void api('cars/'+c.id+'/calendar').then(r=>{const el=$('#detail [data-calendar]');if(el&&selected?.id===c.id)el.textContent=r.intervals.length?'Dolu tarixlər (qaytarma günü xaric): '+r.intervals.map(x=>String(x.starts_on).slice(0,10)+' → '+String(x.ends_on).slice(0,10)).join('; '):'Təsdiqlənmiş rezervasiya ilə bağlı tarix yoxdur. Uyğunluq sorğu göndəriləndə yenidən yoxlanılır.';}).catch(()=>{const el=$('#detail [data-calendar]');if(el)el.textContent='Təqvim alınmadı. Tarixlər sorğu zamanı yenidən yoxlanacaq.';});
 if(!$('#car-dialog').open)$('#car-dialog').showModal();
}
async function workspace(){
 const pane=$('#workspace');pane.hidden=false;pane.focus();pane.scrollIntoView({behavior:'smooth'});
 try{await mountRentalWorkspace($('#workspace-content'),{enabled,user:enabled?await user():null});}catch(e){$('#workspace-content').textContent='Panel yüklənmədi: '+e.message;}
}
$('#workspace-open').addEventListener('click',workspace);$('#partner-open').addEventListener('click',workspace);$('#workspace-close').onclick=()=>{$('#workspace').hidden=true;$('#workspace-open').focus();};
async function loadCars(more=false){
 const p=new URLSearchParams(activeQuery),page=more?carPage+1:1;p.set('page',page);
 const d=await api('cars?'+p);cars=more?[...cars,...d.cars]:d.cars;carPage=page;carTotal=d.total;renderCars();
}
async function loadCompanies(more=false){
 const page=more?companyPage+1:1,d=await api('companies?page='+page);companies=more?[...companies,...d.companies]:d.companies;companyPage=page;companyTotal=d.total;
 $('#companies').hidden=false;$('#company-cards').innerHTML=companies.length?companies.map(p=>`<a class="company-card" href="rentacar.html?company=${esc(p.user_id)}"><span class="company-monogram" aria-hidden="true">${esc(p.name.trim().slice(0,2).toUpperCase())}</span><div><h3>${esc(p.name)} ↗</h3><p>${esc(p.city)} · ${esc(p.car_count)} avtomobil</p></div></a>`).join(''):'<p>Şirkətlər təsdiqləndikcə burada görünəcək.</p>';
 $('#more-companies').hidden=companies.length>=companyTotal;
}
$('#more-cars').onclick=async e=>{e.target.disabled=true;try{await loadCars(true);}catch(err){$('#result-count').textContent=err.message;}finally{e.target.disabled=false;}};
$('#more-companies').onclick=async e=>{e.target.disabled=true;try{await loadCompanies(true);}catch(err){$('#mode').textContent=err.message;}finally{e.target.disabled=false;}};
async function init(){
 try{
  const config=await api('config');enabled=config.enabled;live=config.mode==='live';
  $('#mode').textContent=enabled?((live?'Rezervasiya':'Test mühiti · Rezervasiya')+' sorğuları sahibin təsdiqindən sonra qüvvəyə minir. Ödəniş qəbul edilmir.'):'Dizayn önizləməsi · Avtomobillər və qiymətlər nümunədir. Axtarışı, tarixləri və qiymət hesablamasını yoxlaya bilərsiniz. Real rezervasiya qəbul edilmir.';
  const p=new URLSearchParams(location.search);
  if(enabled&&p.has('company')){
   const d=await api('profiles/'+encodeURIComponent(companyId));cars=d.cars;carTotal=d.total;activeQuery=new URLSearchParams({owner_id:companyId});
   $('#company-profile').hidden=false;$('#company-profile').innerHTML=`<div class="company-profile-card"><a href="rentacar.html">← Bütün şirkətlər və avtomobillər</a><p class="eyebrow">TƏSDİQLƏNMİŞ İCARƏ ŞİRKƏTİ</p><h2>${esc(d.profile.name)}</h2><p>${esc(d.profile.city)} · ${esc(d.total)} avtomobil</p><a class="outline" href="tel:${esc(d.profile.phone)}">${esc(d.profile.phone)}</a></div>`;
   $('#fleet h2').textContent='Şirkətin avtomobil parkı';$('#fleet .eyebrow').textContent=d.profile.name;
  }else if(enabled){await Promise.all([loadCars(),loadCompanies()]);}else cars=demo;
  renderCars();
  if(p.has('car')){const c=enabled?(await api('cars/'+encodeURIComponent(p.get('car')))).car:demo.find(c=>c.id===p.get('car'));if(c)openCar(c);}
  if(p.has('panel'))await workspace();
 }catch(e){$('#mode').textContent='Önizləmə yüklənmədi: '+e.message;$('#cars').innerHTML='<div class="empty">Məlumat alınmadı. Səhifəni yeniləyib təkrar yoxlayın.</div>';$('#result-count').textContent='Yükləmə xətası';}
}
init();
