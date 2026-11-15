/* Native-only enhancements. Do not import into build-hosted-ui.mjs. */
(() => {
 if(location.origin!=='https://sosavto.az'||window.__sosavtoNativeEnhancements)return;
 window.__sosavtoNativeEnhancements=true;document.documentElement.classList.add('sa-native');
 const device=window.Capacitor?.registerPlugin?.('SosAvtoDevice');
 const call=async(name,data={})=>{if(!device)throw Error('Bu funksiya yeni Android paketində işləyir.');return device[name](data);};
 let scheduled=false,lastTheme='';
 function theme(){const value=document.documentElement.getAttribute('data-theme')||'light';if(value===lastTheme)return;lastTheme=value;call('setTheme',{dark:value==='dark'}).catch(()=>{});}
 function dialog(){
  const existing=document.getElementById('sa-device-dialog');if(existing){existing.showModal();return;}
  const d=document.createElement('dialog');d.id='sa-device-dialog';d.className='sa-device-dialog';d.setAttribute('aria-labelledby','sa-device-title');
  d.innerHTML='<header><h2 id="sa-device-title">Tətbiq ayarları</h2><button type="button" aria-label="Bağla">×</button></header><p>Elanlarınız və qiymət dəyişiklikləri haqqında telefon bildirişləri.</p><button type="button" class="btn primary" data-enable>Bildirişləri aktiv et</button><button type="button" class="btn" data-disable>Bildirişləri söndür</button><small>Bildirişlər arxa planda təxminən 15 dəqiqə və ya daha gec yoxlanılır. Dərhal çatdırılma zəmanəti yoxdur. Hesabdan çıxanda yoxlama bildiriş göndərmir.</small><p data-state role="status"></p><a class="btn" href="/bildirisler.html">Bildirişlərim</a><a class="btn" href="/mexfiyyet.html">Məxfilik</a><button type="button" class="btn" data-delete>Hesabın silinməsi üçün müraciət</button><div data-deletion hidden><p>Hesabınızı və əlaqəli şəxsi məlumatlarınızı silmək üçün SosAvto dəstəyinə müraciət edin. Emaildə qeydiyyat telefonunuzu və ya emailinizi qeyd edin. Şifrə və təsdiq kodu göndərməyin.</p><p>Bu düymə email qaralaması açır; hesabı avtomatik silmir. Tələb dəstək tərəfindən yoxlanılıb icra olunur. Saxlanılması zəruri olan məlumat barədə cavabda məlumat verilməlidir.</p><a class="btn primary" href="mailto:sosavtoaz@gmail.com?subject=SosAvto%20hesab%C4%B1n%C4%B1n%20silinm%C9%99si&body=Salam%2C%20SosAvto%20hesab%C4%B1m%C4%B1n%20v%C9%99%20%C9%99laq%C9%99li%20%C5%9F%C9%99xsi%20m%C9%99lumatlar%C4%B1m%C4%B1n%20silinm%C9%99sini%20ist%C9%99yir%C9%99m.%0AQeydiyyat%20emailim%20v%C9%99%20ya%20telefonum%3A%20">Email müraciəti hazırla</a><small>Email proqramı yoxdursa: sosavtoaz@gmail.com</small></div>';
  document.body.append(d);const status=d.querySelector('[data-state]');
  const refresh=async()=>{try{const r=await call('notificationStatus');status.textContent=r.enabled?'Telefon bildirişləri aktivdir.':'Telefon bildirişləri bağlıdır.';}catch(e){status.textContent=e.message;}};
  d.querySelector('header button').onclick=()=>d.close();d.onclick=e=>{if(e.target===d)d.close();};
  d.querySelector('[data-enable]').onclick=async e=>{const button=e.currentTarget;button.disabled=true;try{await call('enableNotifications');await refresh();}catch(err){status.textContent=err.message;}finally{button.disabled=false;}};
  d.querySelector('[data-disable]').onclick=async()=>{try{await call('disableNotifications');await refresh();}catch(err){status.textContent=err.message;}};
  d.querySelector('[data-delete]').onclick=()=>{d.querySelector('[data-deletion]').hidden=false;};
  d.showModal();refresh();
 }
 function mount(){
  const header=document.querySelector('.nav');
  if(header&&!document.getElementById('sa-device-settings')){const b=document.createElement('button');b.type='button';b.id='sa-device-settings';b.className='sa-device-button';b.setAttribute('aria-label','Tətbiq ayarları');b.textContent='⚙ Tətbiq ayarları';b.onclick=dialog;header.append(b);}
  // Format only the seller description text; preserve all existing links and handlers.
  if(location.pathname==='/elan'||location.pathname.endsWith('/elan.html')){
   const root=document.querySelector('.detail-layout');
   root?.querySelectorAll('p.description').forEach(p=>{if(p.children.length||p.dataset.nativePlain)return;const value=p.textContent;if(!/\*\*|^\s*\*\s/m.test(value))return;p.dataset.nativePlain='1';p.classList.add('sa-plain-description');p.textContent=value.replace(/\*\*([^*\n]+)\*\*/g,'$1').replace(/^\s*\*\s+/gm,'• ');});
  }
  theme();
 }
 const observer=new MutationObserver(()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;mount();});});
 observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['data-theme']});mount();
 window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
})();
