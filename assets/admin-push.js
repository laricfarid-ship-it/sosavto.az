const supported=()=>window.isSecureContext&&'serviceWorker'in navigator&&'PushManager'in window&&'Notification'in window;
const ios=()=>/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const standalone=()=>window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone;
const keyBytes=value=>Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4)),c=>c.charCodeAt(0));
const worker=async()=>{
 await navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'});
 let timer;try{return await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Bildiriş xidməti açılmadı. Səhifəni yeniləyin.')),12000);})]);}finally{clearTimeout(timer);}
};
const sameKey=(sub,desired)=>{
 if(!sub?.options?.applicationServerKey)return true;
 const actual=new Uint8Array(sub.options.applicationServerKey);
 return actual.length===desired.length&&actual.every((v,i)=>v===desired[i]);
};
const retryable=error=>!['NotAllowedError','InvalidAccessError','InvalidStateError','NotSupportedError','SecurityError'].includes(error?.name)&&(['AbortError','NetworkError'].includes(error?.name)||/push service (error|not available)|could not connect to push server/i.test(error?.message||''));
const failureMessage=error=>{
 if(Notification.permission==='denied'||error?.name==='NotAllowedError')return 'Bildiriş icazəsi bloklanıb. Chrome-un sayt ayarlarında SosAvto üçün bildirişlərə icazə verin.';
 if(navigator.onLine===false)return 'İnternet bağlantısı yoxdur. İnternetə qoşulub yenidən cəhd edin.';
 if(retryable(error))return 'Chrome telefonun bildiriş xidmətinə qoşula bilmədi. Wi-Fi əvəzinə mobil internetlə (və ya əksinə) yenidən cəhd edin. VPN aktivdirsə söndürün. Problem qalarsa Chrome və Google Play xidmətlərini yeniləyib telefonu yenidən başladın.';
 return error?.message||'Bildirişlər aktivləşmədi. Yenidən cəhd edin.';
};
async function subscribeWithRetry(reg,desired,onRetry){
 for(let attempt=0;attempt<3;attempt++){
  let sub=await reg.pushManager.getSubscription();
  if(sub&&(!sameKey(sub,desired)||(sub.expirationTime&&sub.expirationTime<=Date.now()))){
   if(!await sub.unsubscribe())throw Error('Köhnə bildiriş bağlantısı yenilənmədi. Chrome-u bağlayıb yenidən açın.');
   sub=null;
  }
  if(sub)return sub;
  try{return await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:desired});}
  catch(error){
   if(!retryable(error)||attempt===2||Notification.permission!=='granted'||navigator.onLine===false)throw error;
   onRetry();await new Promise(resolve=>setTimeout(resolve,1000*(attempt+1)));
  }
 }
}
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
  if(Notification.permission==='granted'&&sub&&sameKey(sub,keyBytes(settings.publicKey))&&(!sub.expirationTime||sub.expirationTime>Date.now())){await api('/admin/push','POST',{subscription:sub.toJSON()});active();}
  else if(Notification.permission==='denied'){setStatus('Bildiriş icazəsi bloklanıb. Brauzerin sayt ayarlarında SosAvto üçün bildirişlərə icazə verin.');enable.hidden=true;}
  else reset();
 }catch{setStatus('Bildiriş ayarları yüklənmədi. Səhifəni yeniləyin.');enable.hidden=true;return;}
 enable.onclick=()=>{
  // Keep the permission request in the user's tap; handle its rejection immediately.
  const requested=Notification.permission==='granted'?Promise.resolve('granted'):Notification.requestPermission();
  const result=Promise.resolve(requested).then(value=>({value}),error=>({error}));
  return task(enable,async()=>{
   try{
    const permissionResult=await result;if(permissionResult.error)throw permissionResult.error;
    if(permissionResult.value!=='granted'){setStatus('Bildirişlərə icazə verilmədi. Brauzerin sayt ayarlarından icazə verə bilərsiniz.');return;}
    if(navigator.onLine===false)throw Error('İnternet bağlantısı yoxdur. İnternetə qoşulub yenidən cəhd edin.');
    setStatus('Telefon bildirişləri aktivləşdirilir…');
    const reg=await worker();
    const sub=await subscribeWithRetry(reg,keyBytes(settings.publicKey),()=>setStatus('Bildiriş xidmətinə bağlantı yenidən yoxlanılır…'));
    await api('/admin/push','POST',{subscription:sub.toJSON()});active();toast('Telefon bildirişləri aktivləşdirildi.');
   }catch(error){
    reset();enable.textContent='Yenidən cəhd et';
    const message=failureMessage(error);setStatus(message);toast(message);
   }
  });
 };
 test.onclick=()=>task(test,async()=>{const sub=await subscription();if(!sub){reset();return;}await api('/admin/push','PUT',{endpoint:sub.endpoint});setStatus('Sınaq bildirişi göndərildi. Telefonun bildirişlərini yoxlayın.');});
 disable.onclick=()=>task(disable,async()=>{await disableAdminPush(api);reset();toast('Bu cihazda bildirişlər söndürüldü.');});
}
