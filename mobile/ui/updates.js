/* Update page assets only. Never download native binaries or discard work in progress. */
(() => {
 if(!window.__sosavtoHostedUI || window.__sosavtoUpdates)return;
 window.__sosavtoUpdates=true;
 let dirty=false,checking=false,latest=null;
 let statusText=null;
 const markDirty=event=>{if(event.target.matches('input,select,textarea,[contenteditable=true]'))dirty=true;};
 document.addEventListener('input',markDirty,true);
 document.addEventListener('change',markDirty,true);
 function offer(){
  if(statusText)statusText.textContent='Yeniləmə mövcuddur';
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
 async function check(manual=false){
  if(checking||(!manual&&document.visibilityState==='hidden'))return;
  checking=true;
  try{
   const response=await fetch('/assets/mobile-version.json',{cache:'no-store',credentials:'omit'});
   if(!response.ok)throw Error('version-unavailable');
   const data=await response.json();
   if(typeof data.version!=='string')throw Error('invalid-version');
   if(data.version===window.__sosavtoMobileVersion){if(manual&&statusText)statusText.textContent='Ən son versiyadır';return;}
   latest=data.version;
   const page=location.pathname.split('/').pop()||'index.html';
   const typing=document.activeElement?.matches('input,textarea,select,[contenteditable=true]');
   if(!manual&&!dirty&&!typing&&['index.html','xarita.html'].includes(page))location.reload();
   else offer();
  }catch{if(manual&&statusText)statusText.textContent='Yoxlama alınmadı';/* The existing app keeps working offline. */}
  finally{checking=false;}
 }
 function addControl(){
  if(!document.body||document.getElementById('sa-update-control'))return;
  const panel=document.createElement('div');panel.id='sa-update-control';
  const button=document.createElement('button');button.type='button';button.textContent='↻ Yeniləməni yoxla';
  button.setAttribute('aria-label','SosAvto yeniləməsini yoxla');
  const status=document.createElement('span');status.setAttribute('role','status');status.textContent='';statusText=status;
  button.addEventListener('click',()=>{status.textContent='Yoxlanılır…';check(true);});
  panel.append(button,status);document.body.append(panel);
  const style=document.createElement('style');style.textContent='#sa-update-control{position:fixed;right:12px;bottom:calc(82px + env(safe-area-inset-bottom,0px));z-index:900;display:flex;flex-direction:column;align-items:flex-end;gap:4px;pointer-events:none}#sa-update-control button{pointer-events:auto;border:1px solid #49b7bb;border-radius:999px;background:#102d3b;color:#e8ffff;padding:8px 12px;font:600 12px system-ui;box-shadow:0 4px 15px #0002}#sa-update-control span{font:11px system-ui;color:#137b7c;background:#fff;border-radius:6px;padding:2px 5px}#sa-update-control span:empty{display:none}body:has(#sa-update-control) #sa-update{bottom:calc(132px + env(safe-area-inset-bottom,0px))}';document.head.append(style);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addControl,{once:true});else addControl();
 const timer=setInterval(check,60000);
 const visible=()=>{if(document.visibilityState==='visible')check();};
 document.addEventListener('visibilitychange',visible);
 window.addEventListener('focus',check);
 window.addEventListener('pagehide',()=>{clearInterval(timer);document.removeEventListener('visibilitychange',visible);window.removeEventListener('focus',check);},{once:true});
})();
