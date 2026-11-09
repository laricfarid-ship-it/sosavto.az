export async function mountOperations(content){
 const panes=Object.fromEntries(['business','marketing','android'].map(k=>[k,content.querySelector('[data-ops="'+k+'"]')]));
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',["'"]:'&#39;'}[c]));
 const api=async(method='GET',data)=>{const r=await fetch('/api/admin/operations',{method,credentials:'same-origin',headers:data?{'Content-Type':'application/json'}:{},body:data?JSON.stringify(data):undefined});const x=await r.json();if(!r.ok)throw Error(x.message||x.error||'Sorğu alınmadı');return x;};
 const options=(items,selected)=>items.map(x=>'<option value="'+esc(x)+'"'+(x===selected?' selected':'')+'>'+esc(x)+'</option>').join('');
 async function render(){const d=await api();
 panes.business.innerHTML='<h2>Biznes hesablarının idarə olunması</h2><p>İstifadəçini seç, biznes profilini qeydiyyata al və təsdiq statusunu idarə et.</p><form data-op="business"><label>İstifadəçi<select name="user_id" required>'+d.users.map(u=>'<option value="'+esc(u.id)+'">'+esc(u.username)+' · '+esc(u.email)+'</option>').join('')+'</select></label><label>Biznes adı<input name="name" maxlength="120" required></label><label>Fəaliyyət sahəsi<select name="business_type">'+options(['Avtosalon','Servis','Avtoyuma','Detaling','Ehtiyat hissələri','Digər'])+'</select></label><label>Status<select name="status">'+options(['pending','approved','rejected'])+'</select></label><button>Yadda saxla</button></form><h3>Biznes profilləri</h3><div class="sos-ops-list">'+(d.business.map(b=>'<article><strong>'+esc(b.business_name)+'</strong><span>'+esc(b.username)+' · '+esc(b.business_type)+' · '+esc(b.status)+'</span><button type="button" data-edit-business="'+esc(b.user_id)+'">Redaktə</button></article>').join('')||'<p>Biznes profili yoxdur.</p>')+'</div><p class="sos-ops-note">Bu paneldəki təsdiq biznes profilinin inzibati qeydidir. Saytın istifadəçi qeydiyyatında ayrıca biznes profili axını hələ inteqrasiya edilməyib.</p>';
 panes.marketing.innerHTML='<h2>Instagram və Facebook paylaşımı</h2><p>Yalnız adminin seçdiyi təsdiqlənmiş elan paylaşılır. Elan təsdiqi heç vaxt avtomatik paylaşım yaratmır.</p><div id="social-status">Bağlantı yoxlanır…</div><label>Aktiv elan seçin <select id="social-listing"><option value="">Yüklənir…</option></select></label><label>Platforma <select id="social-platform"><option value="instagram">Instagram</option><option value="facebook">Facebook</option></select></label><button type="button" id="social-preview-btn">Paylaşımı hazırla</button><div id="social-preview-result" aria-live="polite"></div><p class="sos-ops-note">Paylaşım yalnız ayrıca təsdiq düyməsi basıldıqdan sonra göndərilir. Nəticəsi qeyri-müəyyən cəhdlər avtomatik təkrarlanmır.</p><h3>Hazırlıq növbəsi</h3><div class="sos-ops-list">'+(d.social.map(x=>'<article><strong>'+esc(x.platform)+' · '+esc(x.status)+'</strong><span>'+esc(x.title||'Elansız paylaşım')+'</span><p>'+esc(x.caption)+'</p></article>').join('')||'<p>Növbədə paylaşım yoxdur.</p>')+'</div>';
 try {
  const listResponse=await fetch('/api/admin/social-listings',{credentials:'same-origin'});
  const listData=await listResponse.json();
  if(!listResponse.ok)throw Error(listData.message||'Elan siyahısı yüklənmədi');
  const select=panes.marketing.querySelector('#social-listing'),platform=panes.marketing.querySelector('#social-platform');
  select.innerHTML='<option value="">Elan seçin</option>'+listData.listings.map(l=>'<option value="'+esc(l.id)+'">'+esc(l.title||[l.brand,l.model,l.year].filter(Boolean).join(' '))+' · '+esc(l.price)+' AZN</option>').join('');
  const status=panes.marketing.querySelector('#social-status');
  status.textContent='Paylaşım: '+(listData.enabled?'Aktiv':'Serverdə deaktiv')+' · Instagram: '+(listData.configured.instagram?'Qoşulub':'Konfiqurasiya tələb olunur')+' · Facebook: '+(listData.configured.facebook?'Qoşulub':'Konfiqurasiya tələb olunur');
  const previewBtn=panes.marketing.querySelector('#social-preview-btn'),result=panes.marketing.querySelector('#social-preview-result');
  previewBtn.onclick=async()=>{
   const id=select.value,site=platform.value;
   if(!id){result.textContent='Əvvəl elan seçin.';return;}
   result.textContent='Önizləmə hazırlanır…';previewBtn.disabled=true;
   try{
    const response=await fetch('/api/admin/social-preview?id='+encodeURIComponent(id),{credentials:'same-origin'});
    const data=await response.json();if(!response.ok)throw Error(data.message||'Önizləmə alınmadı');
    const preview=data.preview;
    result.replaceChildren();
    const h=document.createElement('h3');h.textContent='Paylaşımın önizləməsi';result.append(h);
    if(preview.imageUrl){const img=document.createElement('img');img.src=preview.imageUrl;img.alt='Elanın şəkli';img.style.cssText='max-width:240px;width:100%;border-radius:12px';result.append(img);}
    const caption=document.createElement('pre');caption.textContent=preview.caption;caption.style.whiteSpace='pre-wrap';result.append(caption);
    const send=document.createElement('button');send.type='button';send.textContent=site==='instagram'?'Instagram-da paylaşımı təsdiqlə':'Facebook-da paylaşımı təsdiqlə';send.disabled=!listData.enabled||!listData.configured[site];result.append(send);
    send.onclick=async()=>{
     if(!confirm('Bu elanı '+site+' hesabında İNDİ yayımlamaq istəyirsiniz?'))return;
     send.disabled=true;
     try{
      const r=await fetch('/api/admin/social-publish',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,platform:site})});
      const x=await r.json();if(!r.ok)throw Error(x.message||'Paylaşım alınmadı');
      result.textContent='Paylaşım göndərildi. Meta post ID: '+x.postId;
     }catch(e){result.textContent='Xəta: '+e.message+' Təkrar göndərməzdən əvvəl Meta hesabını yoxlayın.';}
    };
   }catch(e){result.textContent='Xəta: '+e.message;}finally{previewBtn.disabled=false;}
  };
 }catch(e){panes.marketing.querySelector('#social-status').textContent='Xəta: '+e.message;}

 panes.android.innerHTML='<h2>Android tətbiqinin idarə olunması</h2><p>APK versiyalarını və buraxılış qeydlərini idarə et. Bu panel APK yaratmır və telefondakı tətbiqi avtomatik yeniləmir.</p><form data-op="android"><label>Versiya adı<input name="version_name" placeholder="1.0.1" required></label><label>Versiya kodu<input name="version_code" type="number" min="1" step="1" required></label><label>Kanal<select name="channel">'+options(['internal','beta','production'])+'</select></label><label>APK linki (HTTPS, istəyə bağlı)<input name="apk_url" type="url" placeholder="https://..."></label><label>Yeniliklər<textarea name="release_notes" maxlength="2000" rows="3" required></textarea></label><button>Versiyanı qeyd et</button></form><h3>Buraxılış tarixçəsi</h3><div class="sos-ops-list">'+(d.android.map(x=>'<article><strong>'+esc(x.version_name)+' · '+esc(x.channel)+'</strong><span>Build '+esc(x.version_code)+'</span><p>'+esc(x.release_notes)+'</p>'+(x.apk_url?'<a href="'+esc(x.apk_url)+'" target="_blank" rel="noopener noreferrer">APK linki</a>':'')+'</article>').join('')||'<p>Qeydiyyata alınmış buraxılış yoxdur.</p>')+'</div>';
 panes.business.querySelectorAll('[data-edit-business]').forEach(b=>b.onclick=()=>{const item=d.business.find(x=>x.user_id===b.dataset.editBusiness),f=panes.business.querySelector('form');if(item){f.elements.user_id.value=item.user_id;f.elements.name.value=item.business_name;f.elements.business_type.value=item.business_type;f.elements.status.value=item.status;f.scrollIntoView({behavior:'smooth',block:'center'});}});
 for(const p of Object.values(panes)){const form=p.querySelector('form');if(!form)continue;form.onsubmit=async e=>{e.preventDefault();const btn=form.querySelector('button');btn.disabled=true;try{const data=Object.fromEntries(new FormData(form));if(form.dataset.op==='android')data.version_code=Number(data.version_code);await api('POST',{kind:form.dataset.op,...data});await render();}catch(err){alert(err.message)}finally{btn.disabled=false}};}
 }
 await render();
}
const css=document.createElement('style');css.textContent=`[data-ops] form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px;background:#112633;border:1px solid #34505c;border-radius:14px;padding:20px;margin:20px 0}[data-ops] form label{display:flex;flex-direction:column;gap:7px;color:#b4d1d7;font-size:13px}[data-ops] input,[data-ops] select,[data-ops] textarea{width:100%;min-width:0;background:#091923;border:1px solid #3b5662;color:#ecf8f8;border-radius:8px;padding:11px}[data-ops] form button{background:#29a8dc;border:0;border-radius:9px;padding:12px;color:#081b28;cursor:pointer}[data-ops] .sos-ops-list article{padding:16px;border:1px solid #2c4c59;border-radius:11px;margin:9px 0;display:flex;flex-direction:column;gap:8px}[data-ops] .sos-ops-list article span,[data-ops] .sos-ops-note{color:#a3bfc9;font-size:13px}[data-ops] .sos-ops-list button{align-self:start;background:#264654;color:#fff;border:0;padding:8px;border-radius:8px;cursor:pointer}@media(max-width:650px){[data-ops] form{grid-template-columns:1fr}}`;document.head.append(css);
