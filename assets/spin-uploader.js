import {mountSpinViewer} from './spin-viewer.js';
export function mountSpinUploader(host,{frames=[],enabled,upload,setBusy}){
 let saved=frames.slice(),pending=null,busy=false;
 host.innerHTML='<h2>360° xarici görünüş <small class="muted">— istəyə görə</small></h2><p>Avtomobilin ətrafında bir tam dövrə üzrə <strong>24–36 ardıcıl kadr</strong> seçin. Adi 8 elan şəklindən ayrıca saxlanılır.</p><details><summary>360° üçün necə çəkməli?</summary><ol><li>Avtomobili düz yerdə saxlayın, ətrafında gəzməyə yer olsun.</li><li>Telefonu üfüqi, eyni hündürlükdə və məsafədə tutun. Bütün avtomobil kadrda qalsın.</li><li>Öndən başlayıb bir istiqamətdə tam dövrə vurun: 24 kadr üçün təxminən hər 15°, 36 kadr üçün hər 10°.</li><li>Zoomu, işığı və qapıların vəziyyətini dəyişməyin. Salon şəkillərini bu sıraya qatmayın.</li><li>Faylları 001.jpg, 002.jpg… kimi adlandırın. Ad üzrə sıralanacaq. Yüklədikdən sonra önbaxışda tam dövrəni yoxlayın.</li></ol></details><label class="field">360° kadrlarını seçin<input class="spin-files" type="file" accept="image/jpeg,image/png,image/webp" multiple></label><p class="muted">Hər kadr maksimum 3 MB · JPEG, PNG, WebP. Başqa dəst seçmək mövcud 360° dəstini əvəz edəcək; dəyişiklik elanı saxladıqda tətbiq olunur.</p><p class="spin-upload-state" role="status"></p><div class="form-actions"><button class="btn spin-retry" type="button" hidden>Yükləməyə davam et</button><button class="btn spin-cancel" type="button" hidden>Yeni dəstdən imtina et</button><button class="btn spin-reverse" type="button">Sıranı tərsinə çevir</button><button class="btn danger spin-remove" type="button">360° dəstini çıxar</button></div><ol class="spin-file-list"></ol><div class="spin-preview"></div>';
 const files=host.querySelector('input'),state=host.querySelector('.spin-upload-state'),retry=host.querySelector('.spin-retry'),cancel=host.querySelector('.spin-cancel'),reverse=host.querySelector('.spin-reverse'),remove=host.querySelector('.spin-remove'),preview=host.querySelector('.spin-preview'),list=host.querySelector('ol.spin-file-list');
 function render(){
  files.disabled=!enabled||busy;retry.hidden=!pending||busy;cancel.hidden=!pending||busy;reverse.disabled=busy||!!pending||saved.length===0;remove.disabled=busy||!!pending||saved.length===0;
  list.replaceChildren();for(const [i,p] of saved.entries()){const li=host.ownerDocument.createElement('li');li.textContent=p.name||`Kadr ${i+1}`;list.append(li);}
  mountSpinViewer(preview,saved);
 }
 function busyState(value){busy=value;setBusy(value);render();}
 async function send(){
  if(!pending||busy)return;busyState(true);
  try{
   while(pending.done.length<pending.files.length){const i=pending.done.length,file=pending.files[i];state.textContent=`360° yüklənir: ${i+1} / ${pending.files.length}. Bu səhifəni bağlamayın.`;const result=await upload(file);pending.done.push({...result,name:file.name});}
   saved=pending.done;pending=null;state.textContent=`${saved.length} kadr hazırdır. Önbaxışda sıranı yoxlayın, sonra elanı saxlayın.`;
  }catch(e){state.textContent=`Yükləmə dayandı: ${e.message} Tamamlanmış kadrlar saxlanıb; davam edə və ya yeni dəstdən imtina edə bilərsiniz.`;}
  finally{busyState(false);}
 }
 files.onchange=()=>{
  const selected=[...files.files].sort((a,b)=>a.name.localeCompare(b.name,'en',{numeric:true,sensitivity:'base'}));files.value='';
  if(!enabled||busy)return;
  if(selected.length<24||selected.length>36){state.textContent='Bir dəfəyə 24–36 ardıcıl kadr seçin.';return;}
  if(selected.some(f=>f.size>3*1024*1024||!['image/jpeg','image/png','image/webp'].includes(f.type))){state.textContent='Bütün kadrlar JPEG, PNG və ya WebP, hər biri maksimum 3 MB olmalıdır.';return;}
  pending={files:selected,done:[]};void send();
 };
 retry.onclick=()=>void send();cancel.onclick=()=>{pending=null;state.textContent='Yeni dəstdən imtina edildi. Əvvəlki seçim saxlanıldı.';render();};
 reverse.onclick=()=>{saved.reverse();state.textContent='Sıra tərsinə çevrildi. Önbaxışda yoxlayın.';render();};remove.onclick=()=>{saved=[];state.textContent='360° seçimi çıxarıldı. Tətbiq etmək üçün elanı saxlayın.';render();};
 state.textContent=enabled?(saved.length?`${saved.length} mövcud kadr. Dəyişiklik etməsəniz saxlanılacaq.`:'360° əlavə etmədən də elan verə bilərsiniz.'):'Şəkil yükləmə xidməti hazırda aktiv deyil.';render();
 return {get busy(){return busy;},ids(){if(busy||pending)throw new Error('360° yükləməsini tamamlayın və ya yeni dəstdən imtina edin.');return saved.map(p=>p.id);}};
}
