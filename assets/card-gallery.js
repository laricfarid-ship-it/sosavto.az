export function cardGalleryMarkup(listing,{escape,url,placeholder}){
 const href='/elan?id='+encodeURIComponent(listing.id);
 if(listing.category==='plates'&&listing.details?.plate_number)return `<a href="${href}"><div class="card-photo"><span class="plate-number">${escape(listing.details.plate_number)}</span></div></a>`;
 const photos=[...new Set((listing.card_images?.length?listing.card_images:[listing.image]).map(url).filter(Boolean))].slice(0,8);
 if(photos.length<2)return `<a href="${href}"><div class="card-photo">${photos.length?`<img src="${escape(photos[0])}" alt="${escape(listing.title)}" loading="lazy">`:placeholder}</div></a>`;
 return `<div class="card-gallery" role="group" aria-label="${escape(listing.title)} — şəkillər"><div class="card-photo-track" tabindex="0" aria-label="Şəkilləri sağa-sola sürüşdürün və ya ox düymələrindən istifadə edin">${photos.map((src,i)=>`<a class="card-photo" href="${href}" tabindex="${i===0?'0':'-1'}"><img src="${escape(src)}" alt="${escape(listing.title)} — şəkil ${i+1}" loading="lazy" draggable="false"></a>`).join('')}</div><button class="card-photo-arrow card-photo-prev" type="button" aria-label="Əvvəlki şəkil">‹</button><button class="card-photo-arrow card-photo-next" type="button" aria-label="Növbəti şəkil">›</button><span class="card-photo-count" aria-live="polite">1 / ${photos.length}</span><span class="card-photo-hint">Şəkilləri sürüşdür</span></div>`;
}
export function mountCardGalleries(root){
 for(const gallery of root.querySelectorAll('.card-gallery')){
  if(gallery.dataset.mounted)continue;gallery.dataset.mounted='true';
  const track=gallery.querySelector('.card-photo-track'),slides=[...track.children],previous=gallery.querySelector('.card-photo-prev'),next=gallery.querySelector('.card-photo-next'),count=gallery.querySelector('.card-photo-count');let index=0,start=null,dragged=false;
  function update(){index=Math.max(0,Math.min(slides.length-1,Math.round(track.scrollLeft/(track.clientWidth||1))));previous.disabled=index===0;next.disabled=index===slides.length-1;count.textContent=`${index+1} / ${slides.length}`;slides.forEach((s,i)=>s.tabIndex=i===index?0:-1);}
  function move(i){const target=Math.max(0,Math.min(slides.length-1,i));track.scrollTo({left:target*track.clientWidth,behavior:'auto'});update();}
  previous.onclick=()=>move(index-1);next.onclick=()=>move(index+1);
  track.addEventListener('scroll',update,{passive:true});
  track.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();move(e.key==='Home'?0:e.key==='End'?slides.length-1:index+(e.key==='ArrowRight'?1:-1));});
  track.addEventListener('pointerdown',e=>{start={x:e.clientX,y:e.clientY};dragged=false;},{passive:true});
  track.addEventListener('pointermove',e=>{if(start&&Math.abs(e.clientX-start.x)>10&&Math.abs(e.clientX-start.x)>Math.abs(e.clientY-start.y))dragged=true;},{passive:true});
  track.addEventListener('pointerup',()=>{start=null;},{passive:true});
  track.addEventListener('pointercancel',()=>{start=null;dragged=true;},{passive:true});
  track.addEventListener('click',e=>{if(dragged){e.preventDefault();dragged=false;}},true);
  update();
 }
}
