export async function mountOperations(content){
 const panes=Object.fromEntries(['business','marketing','android'].map(k=>[k,content.querySelector('[data-ops="'+k+'"]')]));
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',["'"]:'&#39;'}[c]));
 const api=async(method='GET',data)=>{const r=await fetch('/api/admin/operations',{method,credentials:'same-origin',headers:data?{'Content-Type':'application/json'}:{},body:data?JSON.stringify(data):undefined});const x=await r.json();if(!r.ok)throw Error(x.message||x.error||'Sorğu alınmadı');return x;};
 const options=(items,selected)=>items.map(x=>'<option value="'+esc(x)+'"'+(x===selected?' selected':'')+'>'+esc(x)+'</option>').join('');
 async function render(){const d=await api();
 panes.business.innerHTML='<h2>Biznes hesablarının idarə olunması</h2><p>İstifadəçini seç, biznes profilini qeydiyyata al və təsdiq statusunu idarə et.</p><form data-op="business"><label>İstifadəçi<select name="user_id" required>'+d.users.map(u=>'<option value="'+esc(u.id)+'">'+esc(u.username)+' · '+esc(u.email)+'</option>').join('')+'</select></label><label>Biznes adı<input name="name" maxlength="120" required></label><label>Fəaliyyət sahəsi<select name="business_type">'+options(['Avtosalon','Servis','Avtoyuma','Detaling','Ehtiyat hissələri','Digər'])+'</select></label><label>Status<select name="status">'+options(['pending','approved','rejected'])+'</select></label><button>Yadda saxla</button></form><h3>Biznes profilləri</h3><div class="sos-ops-list">'+(d.business.map(b=>'<article><strong>'+esc(b.business_name)+'</strong><span>'+esc(b.username)+' · '+esc(b.business_type)+' · '+esc(b.status)+'</span><button type="button" data-edit-business="'+esc(b.user_id)+'">Redaktə</button></article>').join('')||'<p>Biznes profili yoxdur.</p>')+'</div><p class="sos-ops-note">Bu paneldəki təsdiq biznes profilinin inzibati qeydidir. Saytın istifadəçi qeydiyyatında ayrıca biznes profili axını hələ inteqrasiya edilməyib.</p>';
 panes.marketing.innerHTML='<section class="social-studio"><header class="social-head"><div><span class="social-eyebrow">SOSAVTO / SOCIAL STUDIO</span><h2>Sosial paylaşım mərkəzi</h2><p>Təsdiqlənmiş elanları seç və öz qərarınla paylaş</p></div><span class="social-head-icon">↗</span></header><div class="social-step"><span>01</span> Paylaşım platformasını seç</div><div class="social-networks"><button type="button" class="social-network is-selected" data-network="instagram" aria-pressed="true"><span class="social-brand social-instagram"><svg viewBox="0 0 48 48" aria-hidden="true"><rect x="7" y="7" width="34" height="34" rx="11" fill="none" stroke="currentColor" stroke-width="3.4"/><circle cx="24" cy="24" r="8" fill="none" stroke="currentColor" stroke-width="3.4"/><circle cx="34" cy="14.5" r="2.4" fill="currentColor"/></svg></span><strong>Instagram</strong><small>Seçildi ✓</small></button><button type="button" class="social-network" data-network="facebook" aria-pressed="false"><span class="social-brand social-facebook"><svg viewBox="0 0 48 48" aria-hidden="true"><path fill="currentColor" d="M29 43V26h6l1-7h-7v-4c0-2 1-3 4-3h3V6c-2-.3-4-.5-6-.5-6 0-10 3.6-10 10V19h-6v7h6v17z"/></svg></span><strong>Facebook</strong><small>Seç</small></button></div><div class="social-step"><span>02</span> Elanı seç</div><div id="social-listings" class="social-listings"><p>Aktiv elanlar yüklənir…</p></div><div class="social-step"><span>03</span> Paylaşımı yoxla</div><div id="social-preview-result" class="social-preview" aria-live="polite"><div class="social-placeholder">Elanı seçdikdə şəkli, qiyməti və paylaşım mətni burada görünəcək.</div></div><div id="social-status" class="social-status" role="status">Bağlantı yoxlanır…</div><p class="social-footnote">Elan təsdiqi avtomatik paylaşım yaratmır. Yalnız son təsdiqdən sonra Meta hesabına göndərilir.</p></section>';
 try{
  const response=await fetch('/api/admin/social-listings',{credentials:'same-origin'});
  const data=await response.json();if(!response.ok)throw Error(data.message||'Elanlar yüklənmədi');
  const root=panes.marketing,container=root.querySelector('#social-listings'),previewBox=root.querySelector('#social-preview-result'),status=root.querySelector('#social-status');
  let chosenPlatform='instagram',chosenListing=null,requestVersion=0;
  const configured=data.configured||{},listings=data.listings||[],sharingEnabled=Boolean(data.enabled);
  status.textContent=data.enabled?'Paylaşım xidməti aktivdir':'Paylaşım xidməti serverdə deaktivdir. Önizləmə işləyir, real göndəriş bağlıdır.';
  const label=l=>l.title||[l.brand,l.model,l.year].filter(Boolean).join(' ')||'Avtomobil elanı';
  const shareStatus=(l,p)=>l.social_shares?.[p]?.status||'';
  const refreshCards=()=>{
   container.innerHTML=listings.length?'<div class="social-card-grid">'+listings.map(l=>'<button type="button" class="social-listing-card'+(chosenListing===l.id?' is-selected':'')+'" data-listing="'+esc(l.id)+'"><span class="social-listing-symbol">🚘</span><span class="social-listing-copy"><strong>'+esc(label(l))+'</strong><small>'+esc(l.price)+' AZN · '+esc(l.city||'Azərbaycan')+'</small><small>'+(shareStatus(l,chosenPlatform)==='sent'?'✓ Paylaşılıb':shareStatus(l,chosenPlatform)?'Status: '+esc(shareStatus(l,chosenPlatform)):'Paylaşım üçün seç')+'</small></span><span class="social-listing-arrow">›</span></button>').join('')+'</div>':'<p class="social-placeholder">Hazırda paylaşmaq üçün təsdiqlənmiş elan yoxdur.</p>';
   container.querySelectorAll('[data-listing]').forEach(btn=>btn.onclick=()=>{chosenListing=btn.dataset.listing;refreshCards();loadPreview();});
  };
  const loadPreview=async()=>{
   const version=++requestVersion;
   if(!chosenListing){previewBox.innerHTML='<div class="social-placeholder">Əvvəlcə elan seç.</div>';return;}
   previewBox.textContent='Paylaşım hazırlanır…';
   try{
    const response=await fetch('/api/admin/social-preview?id='+encodeURIComponent(chosenListing),{credentials:'same-origin'});
    const data=await response.json();if(!response.ok)throw Error(data.message||'Önizləmə yüklənmədi');
    if(version!==requestVersion)return;
    const p=data.preview,l=listings.find(x=>x.id===chosenListing),sent=shareStatus(l,chosenPlatform);
    previewBox.replaceChildren();
    const layout=document.createElement('div');layout.className='social-preview-layout';
    if(p.imageUrl){const img=document.createElement('img');img.src=p.imageUrl;img.alt='Elanın şəkli';img.loading='lazy';layout.append(img);}
    const content=document.createElement('div');content.className='social-preview-copy';
    const heading=document.createElement('h3');heading.textContent=label(l);content.append(heading);
    const price=document.createElement('strong');price.className='social-preview-price';price.textContent=Number(l.price).toLocaleString('az-AZ')+' AZN';content.append(price);
    const caption=document.createElement('p');caption.textContent=p.caption;content.append(caption);layout.append(content);previewBox.append(layout);
    const button=document.createElement('button');button.type='button';button.className='social-send';button.textContent=sent==='sent'?'✓ Artıq paylaşılıb':chosenPlatform==='instagram'?'Instagram-da paylaş':'Facebook-da paylaş';button.disabled=Boolean(sent)||!sharingEnabled||!configured[chosenPlatform];previewBox.append(button);
    if(sent==='sent'&&chosenPlatform==='instagram'){
     const open=document.createElement('button');open.type='button';open.className='social-send social-open-post';open.textContent='↗ Instagram-da bax';open.disabled=false;previewBox.append(open);
     open.onclick=async()=>{
      open.disabled=true;open.textContent='Instagram linki alınır…';
      try{
       const r=await fetch('/api/admin/social-permalink?id='+encodeURIComponent(chosenListing),{credentials:'same-origin'});
       const d=await r.json();if(!r.ok)throw Error(d.message||'Post linki tapılmadı');
       const link=new URL(d.url);if(link.protocol!=='https:'||!['instagram.com','www.instagram.com'].includes(link.hostname))throw Error('Etibarsız Instagram ünvanı');
       window.location.href=link.href;
      }catch(e){status.textContent='Instagram linki açıla bilmədi: '+e.message;open.disabled=false;open.textContent='↗ Instagram-da bax';}
     };
    }
    if(sent&&sent!=='sent'){const note=document.createElement('p');note.textContent='Əvvəlki paylaşım cəhdi yoxlanmalıdır: '+sent;previewBox.append(note);}
    else if(!sharingEnabled||!configured[chosenPlatform]){const note=document.createElement('p');note.className='social-warning';note.textContent=!sharingEnabled?'Serverdə sosial paylaşım deaktivdir.':'Bu platforma üçün Meta bağlantısı tamamlanmayıb.';previewBox.append(note);}
    button.onclick=async()=>{
     if(!confirm(label(l)+' elanını '+(chosenPlatform==='instagram'?'Instagram':'Facebook')+' hesabında İNDİ paylaşmaq istəyirsiniz?'))return;
     button.disabled=true;button.textContent='Göndərilir…';
     try{
      const r=await fetch('/api/admin/social-publish',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:chosenListing,platform:chosenPlatform})});
      const x=await r.json();if(!r.ok)throw Error(x.message||'Paylaşım uğursuz oldu');
      l.social_shares={...(l.social_shares||{}),[chosenPlatform]:{status:'sent',post_id:x.postId}};
      status.textContent='Paylaşım uğurludur. Meta ID: '+x.postId;refreshCards();loadPreview();
     }catch(e){status.textContent='Paylaşım xətası: '+e.message+' Təkrar cəhddən əvvəl Meta hesabını yoxlayın.';button.textContent='Nəticəni yoxlayın';}
    };
   }catch(e){if(version===requestVersion)previewBox.textContent='Xəta: '+e.message;}
  };
  root.querySelectorAll('[data-network]').forEach(btn=>btn.onclick=()=>{
   chosenPlatform=btn.dataset.network;
   root.querySelectorAll('[data-network]').forEach(b=>{const selected=b===btn;b.classList.toggle('is-selected',selected);b.setAttribute('aria-pressed',String(selected));b.querySelector('small').textContent=selected?'Seçildi ✓':'Seç';});
   refreshCards();loadPreview();
  });
  refreshCards();
 }catch(e){panes.marketing.querySelector('#social-status').textContent='Elanların yüklənməsində xəta: '+e.message;}

 panes.android.innerHTML='<h2>Android tətbiqinin idarə olunması</h2><p>APK versiyalarını və buraxılış qeydlərini idarə et. Bu panel APK yaratmır və telefondakı tətbiqi avtomatik yeniləmir.</p><form data-op="android"><label>Versiya adı<input name="version_name" placeholder="1.0.1" required></label><label>Versiya kodu<input name="version_code" type="number" min="1" step="1" required></label><label>Kanal<select name="channel">'+options(['internal','beta','production'])+'</select></label><label>APK linki (HTTPS, istəyə bağlı)<input name="apk_url" type="url" placeholder="https://..."></label><label>Yeniliklər<textarea name="release_notes" maxlength="2000" rows="3" required></textarea></label><button>Versiyanı qeyd et</button></form><h3>Buraxılış tarixçəsi</h3><div class="sos-ops-list">'+(d.android.map(x=>'<article><strong>'+esc(x.version_name)+' · '+esc(x.channel)+'</strong><span>Build '+esc(x.version_code)+'</span><p>'+esc(x.release_notes)+'</p>'+(x.apk_url?'<a href="'+esc(x.apk_url)+'" target="_blank" rel="noopener noreferrer">APK linki</a>':'')+'</article>').join('')||'<p>Qeydiyyata alınmış buraxılış yoxdur.</p>')+'</div>';
 panes.business.querySelectorAll('[data-edit-business]').forEach(b=>b.onclick=()=>{const item=d.business.find(x=>x.user_id===b.dataset.editBusiness),f=panes.business.querySelector('form');if(item){f.elements.user_id.value=item.user_id;f.elements.name.value=item.business_name;f.elements.business_type.value=item.business_type;f.elements.status.value=item.status;f.scrollIntoView({behavior:'smooth',block:'center'});}});
 for(const p of Object.values(panes)){const form=p.querySelector('form');if(!form)continue;form.onsubmit=async e=>{e.preventDefault();const btn=form.querySelector('button');btn.disabled=true;try{const data=Object.fromEntries(new FormData(form));if(form.dataset.op==='android')data.version_code=Number(data.version_code);await api('POST',{kind:form.dataset.op,...data});await render();}catch(err){alert(err.message)}finally{btn.disabled=false}};}
 }
 await render();
}
const css=document.createElement('style');css.textContent=`[data-ops] form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px;background:#112633;border:1px solid #34505c;border-radius:14px;padding:20px;margin:20px 0}[data-ops] form label{display:flex;flex-direction:column;gap:7px;color:#b4d1d7;font-size:13px}[data-ops] input,[data-ops] select,[data-ops] textarea{width:100%;min-width:0;background:#091923;border:1px solid #3b5662;color:#ecf8f8;border-radius:8px;padding:11px}[data-ops] form button{background:#29a8dc;border:0;border-radius:9px;padding:12px;color:#081b28;cursor:pointer}[data-ops] .sos-ops-list article{padding:16px;border:1px solid #2c4c59;border-radius:11px;margin:9px 0;display:flex;flex-direction:column;gap:8px}[data-ops] .sos-ops-list article span,[data-ops] .sos-ops-note{color:#a3bfc9;font-size:13px}[data-ops] .sos-ops-list button{align-self:start;background:#264654;color:#fff;border:0;padding:8px;border-radius:8px;cursor:pointer}@media(max-width:650px){[data-ops] form{grid-template-columns:1fr}}`;document.head.append(css);

const socialStudioStyle=document.createElement('style');socialStudioStyle.textContent=`
[data-ops="marketing"] .social-studio{background:linear-gradient(150deg,#102b3a,#0c1b29);border:1px solid #345767;border-radius:20px;padding:clamp(16px,3vw,30px);color:#eaf6fa}
.social-head{display:flex;justify-content:space-between;align-items:center;gap:12px;border-bottom:1px solid #31505d;padding-bottom:20px;margin-bottom:23px}.social-head h2{font-size:clamp(21px,2.4vw,29px);margin:6px 0}.social-head p{color:#a7c2cc;margin:0}.social-eyebrow{color:#64ded4;font-size:11px;letter-spacing:2px}.social-head-icon{font-size:30px;color:#67e4d6}
.social-step{display:flex;align-items:center;gap:10px;color:#d9f2f4;font-weight:700;margin:24px 0 13px}.social-step span{color:#60d8d0;background:#183f49;border-radius:8px;padding:6px 9px;font-size:12px}
.social-networks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.social-network{display:flex;flex-direction:column;align-items:center;gap:8px;border:1px solid #355565;background:#152e3d;border-radius:16px;padding:19px 12px;color:#fff;cursor:pointer;transition:background .2s,border-color .2s}.social-network:hover,.social-listing-card:hover{background:#1c3b4a}.social-network.is-selected,.social-listing-card.is-selected{border:2px solid #64dfd6;background:#1b3b49}.social-network strong{font-size:16px}.social-network small{color:#a9c6d0}.social-brand{width:55px;height:55px;border-radius:14px;display:grid;place-items:center}.social-brand svg{width:43px;height:43px}.social-instagram{background:linear-gradient(35deg,#f9c64a,#ed347a,#873db9);color:#fff}.social-facebook{background:#1877f2;color:white}
.social-card-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;max-height:360px;overflow-y:auto}.social-listing-card{min-width:0;display:flex;align-items:center;text-align:left;gap:10px;background:#122c3b;color:#fff;border:1px solid #355565;border-radius:13px;padding:13px;cursor:pointer}.social-listing-symbol{font-size:26px}.social-listing-copy{display:flex;flex-direction:column;min-width:0;gap:5px;flex:1}.social-listing-copy strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.social-listing-copy small{color:#aac7d2}.social-listing-arrow{font-size:24px;color:#6adbd3}
.social-preview{background:#0d2230;border:1px solid #365260;border-radius:14px;padding:17px;min-height:90px}.social-placeholder{color:#a8c3ce;margin:0}.social-preview-layout{display:flex;gap:18px;align-items:flex-start}.social-preview-layout img{width:180px;max-width:38%;border-radius:11px;object-fit:cover;aspect-ratio:4/3}.social-preview-copy{min-width:0;flex:1}.social-preview-copy h3{margin:0 0 8px}.social-preview-price{color:#6be4d0;font-size:20px}.social-preview-copy p{white-space:pre-wrap;color:#c3d8e0;max-height:220px;overflow:auto}.social-send{margin-top:14px;background:linear-gradient(100deg,#52d5cf,#2c9fda);color:#09212d;border:0;border-radius:11px;padding:13px 20px;font-weight:750;cursor:pointer}.social-send:disabled{opacity:.5;cursor:not-allowed}.social-status{margin-top:18px;color:#aed2db}.social-warning{color:#f5c584}.social-footnote{font-size:12px;color:#93b0bc;margin-top:12px}
@media(max-width:650px){.social-card-grid{grid-template-columns:1fr}.social-preview-layout{flex-direction:column}.social-preview-layout img{width:100%;max-width:100%}.social-head-icon{display:none}}
`;document.head.append(socialStudioStyle);

const socialOpenPostStyle=document.createElement('style');socialOpenPostStyle.textContent='.social-open-post{margin-left:10px;background:#193b4c;color:#b6f7ee;border:1px solid #4abcb2}.social-open-post:hover{background:#225366}';document.head.append(socialOpenPostStyle);
