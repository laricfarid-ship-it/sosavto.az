const supported=()=>window.isSecureContext&&'serviceWorker'in navigator&&'PushManager'in window&&'Notification'in window;
const ios=()=>/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const standalone=()=>window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone;
const keyBytes=value=>Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4)),c=>c.charCodeAt(0));
const worker=async()=>{await navigator.serviceWorker.register('/sw.js',{scope:'/'});return Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(Error('Bildiriş xidməti açılmadı. Səhifəni yeniləyin.')),12000))]);};
const subscription=async()=>{const reg=await navigator.serviceWorker.getRegistration('/');return reg?.pushManager.getSubscription();};
export async function disableAdminPush(api){
 if(!supported())return;
 const sub=await subscription();if(!sub)return;
 // Remove server delivery before ending the session on a shared phone.
 await api('/admin/push','DELETE',{endpoint:sub.endpoint});
 await sub.unsubscribe();
}
export async function mountAdminPush(root,{api,toast,task}){
 root.innerHTML='<section class="panel form-section"><h2>Telefon bildirişləri</h2><p>Yeni elan, qeydiyyat və hesaba giriş barədə sayt bağlı olanda da bildiriş alın.</p><p class="muted" data-push-status role="status">Yoxlanılır…</p><div class="form-actions"><button class="btn primary" data-push-enable>Bildirişləri aktiv et</button><button class="btn" data-push-test hidden>Sınaq bildirişi göndər</button><button class="btn" data-push-disable hidden>Bu cihazda söndür</button></div><p class="muted">Bildiriş üçün telefonun interneti və brauzerin bildiriş icazəsi açıq olmalıdır.</p></section>';
 const status=root.querySelector('[data-push-status]'),enable=root.querySelector('[data-push-enable]'),test=root.querySelector('[data-push-test]'),disable=root.querySelector('[data-push-disable]');
 const setStatus=text=>{status.textContent=text;};
 if(ios()&&!standalone()){setStatus('iPhone-da Safari → Paylaş → Ana ekrana əlavə et seçin. Sonra ana ekrandakı SosAvto işarəsindən açın.');enable.hidden=true;return;}
 if(!supported()){setStatus('Bu brauzer telefon bildirişlərini dəstəkləmir. Android-də Chrome ilə açın.');enable.hidden=true;return;}
 let settings;
 const active=()=>{enable.hidden=true;test.hidden=false;disable.hidden=false;setStatus('Bu cihazda bildirişlər aktivdir. Sınaq bildirişi ilə yoxlayın.');};
 const reset=()=>{enable.hidden=false;test.hidden=true;disable.hidden=true;setStatus('Bu cihazda bildirişlər bağlıdır. Aktivləşdirmək üçün düyməyə toxunun.');};
 try{
  settings=await api('/admin/push');
  if(!settings.enabled){setStatus('Telefon bildirişləri hələ aktivləşdirilməyib.');enable.hidden=true;return;}
  const sub=await subscription();
  if(Notification.permission==='granted'&&sub){await api('/admin/push','POST',{subscription:sub.toJSON()});active();}
  else if(Notification.permission==='denied'){setStatus('Bildiriş icazəsi bloklanıb. Brauzerin sayt ayarlarında SosAvto üçün bildirişlərə icazə verin.');enable.hidden=true;}
  else reset();
 }catch{setStatus('Bildiriş ayarları yüklənmədi. Səhifəni yeniləyin.');enable.hidden=true;return;}
 enable.onclick=()=>{
  // Permission must be requested directly from the user's tap (including iOS).
  const permission=Notification.requestPermission();
  return task(enable,async()=>{
   if(await permission!=='granted'){setStatus('Bildirişlərə icazə verilmədi. Brauzerin sayt ayarlarından icazə verə bilərsiniz.');return;}
   const reg=await worker();let sub=await reg.pushManager.getSubscription();
   const desired=keyBytes(settings.publicKey);
   if(sub&&sub.options.applicationServerKey&&!desired.every((v,i)=>new Uint8Array(sub.options.applicationServerKey)[i]===v)){await sub.unsubscribe();sub=null;}
   if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:desired});
   await api('/admin/push','POST',{subscription:sub.toJSON()});active();toast('Telefon bildirişləri aktivləşdirildi.');
  });
 };
 test.onclick=()=>task(test,async()=>{const sub=await subscription();if(!sub){reset();return;}await api('/admin/push','PUT',{endpoint:sub.endpoint});setStatus('Sınaq bildirişi göndərildi. Telefonun bildirişlərini yoxlayın.');});
 disable.onclick=()=>task(disable,async()=>{await disableAdminPush(api);reset();toast('Bu cihazda bildirişlər söndürüldü.');});
}
