/* Update page assets only. Never download native binaries or discard work in progress. */
(() => {
 if(!window.__sosavtoHostedUI || window.__sosavtoUpdates)return;
 window.__sosavtoUpdates=true;
 let dirty=false,checking=false,latest=null;
 const markDirty=event=>{if(event.target.matches('input,select,textarea,[contenteditable=true]'))dirty=true;};
 document.addEventListener('input',markDirty,true);
 document.addEventListener('change',markDirty,true);
 function offer(){
  if(!document.body||document.getElementById('sa-update'))return;
  const banner=document.createElement('aside');banner.id='sa-update';banner.setAttribute('role','status');
  const text=document.createElement('span');text.textContent='Yeni versiya hazırdır. İşiniz bitəndə yeniləyin.';
  const button=document.createElement('button');button.type='button';button.textContent='Yenilə';
  button.addEventListener('click',()=>{
   if(dirty && !window.confirm('Yazdığınız saxlanılmamış məlumatlar silinə bilər. Yenilənsin?'))return;
   location.reload();
  });
  banner.append(text,button);document.body.append(banner);
 }
 async function check(){
  if(checking||document.visibilityState==='hidden')return;
  checking=true;
  try{
   const response=await fetch('/assets/mobile-version.json',{cache:'no-store',credentials:'omit'});
   if(!response.ok)return;
   const data=await response.json();
   if(typeof data.version!=='string'||data.version===window.__sosavtoMobileVersion)return;
   latest=data.version;
   const page=location.pathname.split('/').pop()||'index.html';
   const typing=document.activeElement?.matches('input,textarea,select,[contenteditable=true]');
   if(!dirty&&!typing&&['index.html','xarita.html'].includes(page))location.reload();
   else offer();
  }catch{/* A failed update check does not affect listings, auth or the current UI. */}
  finally{checking=false;}
 }
 const timer=setInterval(check,60000);
 const visible=()=>{if(document.visibilityState==='visible')check();};
 document.addEventListener('visibilitychange',visible);
 window.addEventListener('focus',check);
 window.addEventListener('pagehide',()=>{clearInterval(timer);document.removeEventListener('visibilitychange',visible);window.removeEventListener('focus',check);},{once:true});
})();
