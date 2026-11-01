const form=document.querySelector('#directory-filters');
const results=document.querySelector('#directory-results');
const status=document.querySelector('#directory-status');
const map=document.querySelector('#directory-map-list');
const pagination=document.querySelector('#directory-pagination');
const mapFrame=document.querySelector('#directory-map-frame');
const names={wash:'Avtoyuma',detailing:'Detailing',repair:'Avtoservis',parts:'Ehtiyat hissələri',tyres:'Təkər xidməti',electrical:'Avtoelektrik',bodywork:'Kuzov və rəng',roadside:'Yol yardımı'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const urlFor=(b)=>Number.isFinite(Number(b.latitude))&&Number.isFinite(Number(b.longitude))&&b.latitude!=null&&b.longitude!=null?'https://www.openstreetmap.org/?mlat='+encodeURIComponent(b.latitude)+'&mlon='+encodeURIComponent(b.longitude)+'#map=16/'+encodeURIComponent(b.latitude)+'/'+encodeURIComponent(b.longitude):null;
let page=1;
async function load(){
 status.textContent='Yüklənir…';results.replaceChildren();map.replaceChildren();pagination.replaceChildren();
 const params=new URLSearchParams(new FormData(form));for(const [k,v] of [...params])if(!String(v).trim())params.delete(k);params.set('page',String(page));
 try{
  const response=await fetch('/api/service-businesses?'+params,{credentials:'same-origin'});
  const data=await response.json();if(!response.ok)throw Error(data.error||'Məlumatlar alınmadı.');
  status.textContent=data.total+' müəssisə tapıldı.';
  if(!data.businesses.length){results.innerHTML='<p class="directory-empty">Bu filtr üzrə hələ müəssisə yoxdur.</p>';map.innerHTML='<p class="directory-muted">Xəritədə göstəriləcək məntəqə yoxdur.</p>';return;}
  for(const b of data.businesses){
   const card=document.createElement('article');card.className='directory-card';
   const location=[b.district,b.city].filter(Boolean).join(', ');
   const link=urlFor(b);
   card.innerHTML='<span class="directory-tag">'+esc(names[b.category]||b.category)+'</span><h2>'+esc(b.name)+'</h2><p>'+esc([b.address,location].filter(Boolean).join(' · '))+'</p><p class="directory-muted">'+(b.ownership_status==='verified'?'Sahibi təsdiqlənib':'Sahibi tərəfindən təsdiqlənməyib')+'</p>'+(link?'<a href="'+esc(link)+'" target="_blank" rel="noopener noreferrer">Xəritədə aç</a>':'');
   results.append(card);
   if(link){const a=document.createElement('a');a.href=link;a.target='_blank';a.rel='noopener noreferrer';a.textContent=b.name+' — '+location;map.append(a);const marker=document.createElement('button');marker.type='button';marker.className='btn';marker.textContent='Xəritədə göstər: '+b.name;marker.addEventListener('click',()=>{const lat=Number(b.latitude),lon=Number(b.longitude);const bbox=[lon-.012,lat-.009,lon+.012,lat+.009].map(encodeURIComponent).join('%2C');mapFrame.src='https://www.openstreetmap.org/export/embed.html?bbox='+bbox+'&layer=mapnik&marker='+encodeURIComponent(lat)+'%2C'+encodeURIComponent(lon);});map.append(marker);}
  }
  for(const [label,n] of [['Əvvəlki',page-1],['Sonrakı',page+1]]){if(n<1||n>data.pages)continue;const button=document.createElement('button');button.type='button';button.className='btn';button.textContent=label;button.addEventListener('click',()=>{page=n;load();});pagination.append(button);}
 }catch(e){status.textContent='Xəta: '+e.message;}
}
form.addEventListener('submit',e=>{e.preventDefault();page=1;load();});
load();
