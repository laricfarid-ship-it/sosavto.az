const roles=[['front','Ön görünüş','Ön hissə və loqo aydın görünsün.'],['rear','Arxa görünüş','Arxa hissə və model yazısı görünsün.'],['interior','Salon','Sükan və cihazlar paneli görünsün.']];
const labels={brand:'Marka',model:'Model',color:'Rəng',body:'Ban növü'};
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export async function prepareCarPhoto(file,win=window){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>12*1024*1024)throw Error('JPEG, PNG və ya WebP seçin, maksimum 12 MB. HEIC şəkillərini əvvəl JPEG kimi saxlayın.');
 const data=await new Promise((resolve,reject)=>{const r=new win.FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('Şəkil oxunmadı.'));r.readAsDataURL(file);});
 const img=await new Promise((resolve,reject)=>{const image=new win.Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('Şəkil açıla bilmədi.'));image.src=data;});
 if(img.naturalWidth*img.naturalHeight>20000000||img.naturalWidth<240||img.naturalHeight<160)throw Error('Şəklin ölçüsü uyğun deyil. 240 × 160-dan böyük, 20 meqapikseldən kiçik şəkil seçin.');
 const canvas=win.document.createElement('canvas'),ratio=Math.min(1,1280/img.naturalWidth,960/img.naturalHeight);canvas.width=Math.round(img.naturalWidth*ratio);canvas.height=Math.round(img.naturalHeight*ratio);
 const context=canvas.getContext('2d');if(!context)throw Error('Brauzer şəkli hazırlaya bilmədi. Başqa brauzerdə sınayın.');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(img,0,0,canvas.width,canvas.height);
 for(const quality of [0.88,0.78,0.65]){const result=canvas.toDataURL('image/jpeg',quality);if(result.length<950000)return result;}
 throw Error('Şəkil çox böyükdür. Daha kiçik şəkil seçin.');
}

// Never overwrite unrelated fields; brand/model must remain a consistent pair.
export function applyCarSuggestions(form,result,keys,updateModels=()=>{},dryRun=false){
 const el=form.elements,s=result.suggestions;
 for(const key of keys)if(!Object.hasOwn(labels,key)||!s[key])throw Error('Təklif seçimi düzgün deyil.');
 const brand=keys.includes('brand')?s.brand.value:el.brand.value;
 if(keys.includes('model')&&brand!==s.brand?.value)throw Error('Modeli tətbiq etmək üçün uyğun marka təklifini də seçin.');
 if(keys.includes('brand')&&brand!==el.brand.value&&el.model.value&&!keys.includes('model'))throw Error('Marka dəyişirsə, model təklifini də seçin və ya hazırkı modeli əvvəl əl ilə təmizləyin.');
 for(const key of keys)if(el[key].tagName==='SELECT'&&![...el[key].options].some(o=>o.value===s[key].value))throw Error('Təklif forma ilə uyğunlaşmadı. Məlumatı əl ilə seçin.');
 if(dryRun)return;
 for(const key of keys)el[key].value=s[key].value;
 if(keys.includes('brand'))updateModels();
}

export async function mountCarAnalysis({root,form,api,updateModels,addPhotos,onBusy=()=>{},prepare=prepareCarPhoto,analysisId=null}){
 const doc=root.ownerDocument,win=doc.defaultView;
 let pictures={},busy=false,externalBusy=false,version=0,key=win.crypto.randomUUID(),result=null,reviewValues={};
 root.innerHTML=`<div class="car-ai-heading"><span class="badge">Şəkildən məlumat</span><h2>Üç şəkil. Daha az yazı.</h2><p>Ön, arxa və salon şəkillərini seçin. AI təklif edəcək, son qərarı siz verəcəksiniz.</p></div><div class="car-ai-photos">${roles.map(([role,label,hint],i)=>`<div class="car-ai-slot"><label for="car-ai-${role}"><span class="car-ai-number">0${i+1}</span><strong>${label}</strong><small>${hint}</small></label><img data-preview="${role}" alt="${label} üçün seçilmiş şəkil" hidden><input id="car-ai-${role}" data-role="${role}" type="file" accept="image/jpeg,image/png,image/webp"><button data-clear="${role}" class="btn small" type="button" hidden>Şəkli sil</button></div>`).join('')}</div><p class="muted">JPEG, PNG, WebP · hər biri maksimum 12 MB. Şəkillər kiçildilir. Üz, sənəd və şəxsi məlumat görünməyən şəkillər seçin.</p><label class="check"><input type="checkbox" id="car-ai-consent"> Analiz üçün bu 3 şəklin Anthropic AI xidmətinə göndərilməsinə razıyam.</label><div class="form-actions"><button type="button" class="btn primary" id="car-ai-analyze" disabled>Şəkillərdən məlumatları tap</button><button type="button" class="btn small" id="car-ai-new" hidden>Yeni analiz başlat</button><small class="muted">Son 24 saatda maksimum 2 analiz cəhdi.</small></div><p id="car-ai-status" role="status" aria-live="polite"></p><div id="car-ai-result"></div>`;
 const $=s=>root.querySelector(s),all=s=>[...root.querySelectorAll(s)];
 function sync(){const disabled=busy||externalBusy;$('#car-ai-analyze').disabled=disabled||roles.some(([r])=>!pictures[r])||!$('#car-ai-consent').checked;all('[data-role],[data-clear],#car-ai-consent,#car-ai-new,#car-ai-apply,[data-field]').forEach(e=>e.disabled=disabled);$('#car-ai-analyze').textContent=busy?'Yoxlanılır…':'Şəkillərdən məlumatları tap';root.setAttribute('aria-busy',String(busy));}
 function setBusy(value){busy=value;onBusy(value);sync();}
 function invalidate(){version++;key=win.crypto.randomUUID();result=null;const url=new URL(win.location.href);url.searchParams.delete('analysis');win.history.replaceState(null,'',url);$('#car-ai-result').replaceChildren();$('#car-ai-status').textContent='';$('#car-ai-new').hidden=true;sync();}
 function renderResult(value){
  result=value;reviewValues=Object.fromEntries(Object.keys(labels).map(k=>[k,form.elements[k].value]));
  const box=$('#car-ai-result');box.replaceChildren();
  const title=doc.createElement('h3');title.textContent=value.status==='ready'?'Təklifləri yoxlayın':'Daha aydın şəkillər lazımdır';box.append(title);
  const note=doc.createElement('p');note.textContent=value.status==='ready'?'AI səhv edə bilər. Yalnız seçdiyiniz məlumatlar tətbiq ediləcək. İl, yürüş və qiymət dəyişməyəcək.':'Avtomobil və ya görünüşlər əminliklə müəyyən edilmədi. Formaya heç nə yazılmadı.';box.append(note);
  if(value.same_vehicle!=='yes'){const p=doc.createElement('p');p.textContent='Üç şəklin eyni avtomobilə aid olduğu aydın deyil.';box.append(p);}
  for(const role of value.issues||[]){const p=doc.createElement('p');p.textContent=(roles.find(([r])=>r===role)?.[1]||'Şəkil')+': daha aydın və uyğun görünüş seçin.';box.append(p);}
  for(const message of value.notes||[]){const p=doc.createElement('p');p.className='muted';p.textContent=message;box.append(p);}
  if(value.status!=='ready')return;
  const rows=doc.createElement('div');rows.className='car-ai-suggestions';
  for(const [field,label]of Object.entries(labels)){
   const suggestion=value.suggestions[field];if(!suggestion)continue;
   const old=form.elements[field].value;
   const row=doc.createElement('label');row.className='car-ai-suggestion';row.innerHTML=`<input type="checkbox" data-field="${field}" ${old?'':'checked'}><span><strong>${label}</strong><span>${escape(suggestion.value)}</span><small>${suggestion.confidence==='high'?'Daha əmin təklif':'Yoxlama tələb edən təklif'}${old?' · Hazırkı: '+escape(old):''}</small></span>`;rows.append(row);
  }
  box.append(rows);
  const apply=doc.createElement('button');apply.type='button';apply.className='btn primary';apply.id='car-ai-apply';apply.textContent=Object.keys(pictures).length?'Seçilənləri və şəkilləri elana əlavə et':'Seçilənləri formaya tətbiq et';box.append(apply);
  apply.onclick=async()=>{
   if(busy||externalBusy||form.elements.category.value!=='car')return;
   const keys=all('[data-field]:checked').map(e=>e.dataset.field);
   if(!keys.length){$('#car-ai-status').textContent='Tətbiq etmək istədiyiniz məlumatları seçin.';return;}
   if(Object.keys(labels).some(k=>form.elements[k].value!==reviewValues[k])){renderResult(value);$('#car-ai-status').textContent='Formadakı məlumatlar dəyişib. Seçimləri yenidən yoxlayın.';return;}
   // Validate first; image-upload errors must not partly change fields.
   try{applyCarSuggestions(form,value,keys,()=>{},true);}
   catch(e){$('#car-ai-status').textContent=e.message;return;}
   setBusy(true);
   try{if(Object.keys(pictures).length)await addPhotos(roles.map(([r])=>pictures[r]));if(Object.keys(labels).some(k=>form.elements[k].value!==reviewValues[k])){renderResult(value);throw Error('Məlumatlar dəyişib. Təklifləri yenidən yoxlayın.');}applyCarSuggestions(form,value,keys,updateModels);$('#car-ai-status').textContent='Seçilən məlumatlar əlavə edildi. İli, yürüşü, qiyməti və digər sahələri yoxlayıb tamamlayın.';$('#car-ai-result').replaceChildren();result=null;}
   catch(e){$('#car-ai-status').textContent=e.message;}finally{setBusy(false);}
  };
 }
 all('[data-role]').forEach(input=>input.onchange=async()=>{
  if(busy||externalBusy)return;
  const role=input.dataset.role,file=input.files?.[0];input.value='';if(!file)return;
  invalidate();setBusy(true);
  try{const data=await prepare(file,win);if(Object.entries(pictures).some(([r,p])=>r!==role&&p.data===data))throw Error('Eyni şəkli təkrar seçməyin. Hər görünüş üçün ayrı şəkil lazımdır.');pictures[role]={role,data};const img=$(`[data-preview="${role}"]`);img.src=data;img.hidden=false;$(`[data-clear="${role}"]`).hidden=false;$('#car-ai-status').textContent='Şəkil hazırdır.';}
  catch(e){$('#car-ai-status').textContent=e.message;}finally{setBusy(false);}
 });
 all('[data-clear]').forEach(button=>button.onclick=()=>{delete pictures[button.dataset.clear];const img=$(`[data-preview="${button.dataset.clear}"]`);img.removeAttribute('src');img.hidden=true;button.hidden=true;invalidate();});
 $('#car-ai-consent').onchange=sync;
 $('#car-ai-new').onclick=()=>{invalidate();$('#car-ai-status').textContent='Yeni analiz ayrıca cəhd sayılacaq.';};
 $('#car-ai-analyze').onclick=async()=>{
  if(busy||externalBusy||roles.some(([r])=>!pictures[r])||!$('#car-ai-consent').checked||form.elements.category.value!=='car')return;
  const snapshot=version;setBusy(true);$('#car-ai-result').replaceChildren();$('#car-ai-status').textContent='Üç şəkil birlikdə yoxlanılır. Bu, bir qədər vaxt apara bilər.';
  try{const response=await api('/analyze-car','POST',{client_key:key,images:roles.map(([r])=>({role:r,data:pictures[r].data}))});if(snapshot!==version)return;renderResult(response.result);const url=new URL(win.location.href);url.searchParams.set('analysis',response.id);win.history.replaceState(null,'',url);$('#car-ai-status').textContent='Analiz tamamlandı. Təkliflər hələ formaya tətbiq edilməyib.';}
  catch(e){$('#car-ai-status').textContent=e.message+' Əl ilə elan yerləşdirmək mümkündür.';$('#car-ai-new').hidden=e.status!==409;}
  finally{setBusy(false);}
 };
 if(analysisId){setBusy(true);try{const response=await api('/car-analyses/'+encodeURIComponent(analysisId));renderResult(response.result);$('#car-ai-status').textContent='Saxlanmış analiz açıldı. Şəkilləri elana ayrıca əlavə edin.';}catch(e){$('#car-ai-status').textContent=e.message;}finally{setBusy(false);}}
 sync();
 return {isBusy:()=>busy,setExternalBusy(value){externalBusy=value;sync();},categoryChanged(){if(form.elements.category.value!=='car'){invalidate();}sync();}};
}
