const safeURL=v=>typeof v==='string'&&(/^(https:\/\/|\/media\/)/.test(v))?v:'';
export function mountSpinViewer(host,frames){
 const urls=(frames||[]).map(p=>safeURL(p.url)).filter(Boolean);
 if(urls.length<24||urls.length>36){host.replaceChildren();host.hidden=true;return;}
 host.hidden=false;host.innerHTML='<div class="spin-heading"><h2>Avtomobilə 360° baxış</h2><span class="badge">360°</span></div><p class="muted">Açdıqdan sonra sağa-sola sürüşdürün və ya ox düymələrindən istifadə edin. Bu, satıcının çəkdiyi ardıcıl şəkillərdir.</p><button class="btn primary spin-start" type="button">360° baxışı aç</button><div class="spin-content" hidden><div class="spin-stage" tabindex="0" role="region" aria-label="Avtomobili fırlatmaq üçün sürüşdürün və ya sol-sağ ox düymələrini basın"><img alt="Avtomobilin 360° görünüşü" draggable="false"></div><div class="spin-tools"><button type="button" class="btn spin-prev" aria-label="360° əvvəlki kadr">‹</button><label>Kadr<input class="spin-range" type="range" min="0" step="1" aria-label="360° baxış bucağı"></label><button type="button" class="btn spin-next" aria-label="360° növbəti kadr">›</button></div><p class="spin-position"></p><p class="spin-state muted" role="status"></p></div>';
 const stage=host.querySelector('.spin-stage'),img=stage.querySelector('img'),range=host.querySelector('input'),state=host.querySelector('.spin-state'),position=host.querySelector('.spin-position');let index=0,drag=null,active=false;
 range.max=String(urls.length-1);
 function neighbors(){for(const n of [-1,1]){const p=new host.ownerDocument.defaultView.Image();p.src=urls[(index+n+urls.length)%urls.length];}}
 function show(n){index=(n%urls.length+urls.length)%urls.length;range.value=String(index);range.setAttribute('aria-valuetext',`${index+1} / ${urls.length}`);position.textContent=`Kadr ${index+1} / ${urls.length}`;img.alt=`Avtomobilin 360° görünüşü — kadr ${index+1}`;state.textContent='Kadr yüklənir…';img.src=urls[index];neighbors();}
 img.onload=()=>{state.textContent='';};img.onerror=()=>{state.textContent='Bu kadr yüklənmədi. Növbəti kadra keçin və ya adi şəkillərə baxın.';};
 host.querySelector('.spin-start').onclick=e=>{active=true;e.currentTarget.hidden=true;host.querySelector('.spin-content').hidden=false;show(0);stage.focus();};
 host.querySelector('.spin-prev').onclick=()=>show(index-1);host.querySelector('.spin-next').onclick=()=>show(index+1);range.oninput=()=>show(Number(range.value));
 stage.addEventListener('keydown',e=>{if(!active||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();show(e.key==='Home'?0:e.key==='End'?urls.length-1:index+(e.key==='ArrowRight'?1:-1));});
 stage.addEventListener('pointerdown',e=>{if(!active||e.isPrimary===false||(e.pointerType==='mouse'&&e.button!==0))return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,index};stage.setPointerCapture?.(e.pointerId);});
 stage.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)<Math.abs(dy))return;const target=((drag.index+Math.trunc(dx/12))%urls.length+urls.length)%urls.length;if(target!==index)show(target);});
 const stop=()=>{drag=null;};stage.addEventListener('pointerup',stop);stage.addEventListener('pointercancel',stop);stage.addEventListener('lostpointercapture',stop);stage.addEventListener('dragstart',e=>e.preventDefault());
 return {show};
}
