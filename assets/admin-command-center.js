// Admin-only command center. All figures come from /api/admin/overview; no sample data.
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const commandStyle=document.createElement('style');commandStyle.textContent=`#admin-command-center.sos-admin-command{background:linear-gradient(145deg,#102430,#0b1825);border:1px solid #315061;border-radius:18px;padding:clamp(16px,2.5vw,30px);box-shadow:0 16px 45px #0002}#admin-command-center .sos-command-heading{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:24px}#admin-command-center .sos-command-heading h2{margin:5px 0}#admin-command-center .sos-command-eyebrow{font-size:11px;letter-spacing:2px;color:#76adba}#admin-command-center .sos-command-live{font-size:12px;color:#69e3c4;border:1px solid #35665e;border-radius:30px;padding:7px 11px}#admin-command-center .sos-command-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:16px 0 25px}#admin-command-center .sos-command-stats .stat{border:1px solid #31505e;border-radius:13px;padding:18px;background:#122b39;min-width:0}#admin-command-center .sos-command-stats .stat strong{display:block;font-size:clamp(21px,2.5vw,30px);color:#6ce5c7}#admin-command-center .sos-command-stats .stat span{display:block;color:#a9c5ce;font-size:12px;margin-top:8px}#admin-command-center .sos-command-growth{display:flex;align-items:end;gap:8px;height:130px;border-bottom:1px solid #355867;margin:15px 0 20px}#admin-command-center .sos-command-day{flex:1;height:100%;display:flex;align-items:end}#admin-command-center .sos-command-day span{width:100%;background:linear-gradient(#6ce8c6,#1b817a);border-radius:5px 5px 0 0;min-height:4px}#admin-command-center h3{margin:25px 0 12px}@media(max-width:950px){#admin-command-center .sos-command-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:450px){#admin-command-center .sos-command-stats{gap:8px}#admin-command-center .sos-command-stats .stat{padding:12px}}`;document.head.append(commandStyle);

const premiumCss=document.createElement('style');premiumCss.textContent=`
#admin-command-center.sos-admin-command{padding:0!important;background:#091521!important;overflow:hidden;max-width:100%}
#admin-command-center .premium-shell{display:grid;grid-template-columns:215px minmax(0,1fr);min-height:560px}
#admin-command-center .premium-nav{background:#0b1d2d;border-right:1px solid #284458;padding:22px 12px}
#admin-command-center .premium-brand{padding:8px 12px 23px;font-size:17px;font-weight:800;color:#e9f7fa}
#admin-command-center .premium-brand small{display:block;color:#6ce5c7;font-size:10px;letter-spacing:2px;margin-top:6px}
#admin-command-center .premium-nav button{display:block;width:100%;text-align:left;border:0;background:transparent;color:#b4c8d3;padding:12px 13px;border-radius:10px;cursor:pointer;font:inherit;font-size:13px;margin-bottom:3px}
#admin-command-center .premium-nav button[aria-selected=true]{background:#183a4c;color:#7ef2d3;font-weight:700}
#admin-command-center .premium-body{padding:clamp(16px,3vw,30px);min-width:0}
#admin-command-center .premium-kicker{font-size:11px;letter-spacing:2px;color:#70cbbd}
#admin-command-center .premium-body h2{font-size:clamp(20px,2.5vw,28px);margin:8px 0 6px}
#admin-command-center .premium-sub{color:#9bb5c1;margin:0 0 24px}
#admin-command-center .premium-view[hidden]{display:none}
#admin-command-center .premium-tiles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
#admin-command-center .premium-tile{padding:18px;background:#102a39;border:1px solid #24475a;border-radius:13px;min-width:0}
#admin-command-center .premium-tile strong{font-size:26px;color:#79e8cb;display:block}
#admin-command-center .premium-tile span{font-size:12px;color:#b1c7d0}
#admin-command-center .premium-info{border:1px solid #2c5260;border-radius:13px;padding:18px;background:#102331;line-height:1.7}
#admin-command-center .premium-link{display:inline-block;margin:10px 10px 0 0;color:#86ebd3}
@media(max-width:800px){#admin-command-center .premium-shell{grid-template-columns:minmax(0,1fr)}#admin-command-center .premium-nav{border-right:0;border-bottom:1px solid #284458;padding:12px}#admin-command-center .premium-brand{padding:5px 9px 12px}#admin-command-center .premium-nav-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px}#admin-command-center .premium-nav button{margin:0;font-size:12px;padding:10px 8px}#admin-command-center .premium-tiles{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:380px){#admin-command-center .premium-tiles{grid-template-columns:1fr}}
`;document.head.append(premiumCss);
const premiumSections=[
 ['overview','Ümumi baxış'],['listings','Elanlar'],['business','İstifadəçilər və biznes'],['services','Xəritə və xidmətlər'],['finance','Maliyyə və komissiyalar'],['marketing','Marketinq və sosial'],['sos','SOS və Avtoyuma'],['android','Android tətbiqi'],['notifications','Bildirişlər və təhlükəsizlik'],['legacy','Mövcud admin əməliyyatları']
];
function premiumTile(label,value){return '<div class="premium-tile"><strong>'+Number(value||0).toLocaleString('az-AZ')+'</strong><span>'+escapeHtml(label)+'</span></div>';}
function premiumShell(host,data){
 const section=(id,html)=>'<section class="premium-view" data-premium-view="'+id+'" hidden>'+html+'</section>';
 const info=(heading,body)=>'<h2>'+heading+'</h2><div class="premium-info">'+body+'</div>';
 const tiles='<div class="premium-tiles">'+premiumTile('Ümumi elan',data.total)+premiumTile('Aktiv elan',(data.statuses||[]).find(x=>x.status==='active')?.count)+premiumTile('Yoxlanacaq elan',data.operations?.listings_pending)+premiumTile('İstifadəçi',data.operations?.users_total)+premiumTile('Yeni qeydiyyat (7 gün)',data.operations?.users_last7)+premiumTile('Açıq şikayət',data.operations?.reports_open)+'</div>';
 const views={
 overview:'<h2>Platformaya ümumi baxış</h2><p class="premium-sub">Canlı məlumat bazasından göstəricilər</p>'+tiles,
 listings:info('Elanların idarə olunması','Təsdiq, rədd, şikayət və istifadəçi əməliyyatları mövcud admin panelində işləyir.<p><button type="button" class="btn" data-open-legacy>Elan moderasiyasını aç</button></p>'),
 business:info('Biznes hesabları','Avtosalon müraciətlərinin təsdiqi üçün mövcud panelə keçin. Digər biznes hesablarının tam idarəetməsi hələ qoşulmayıb.<p><a class="premium-link" href="/avtosalon-panel.html">Avtosalon idarəetməsi</a></p>'),
 services:info('Xəritə və xidmətlər','Xidmət elanları: <strong>'+Number(data.operations?.service_listings||0)+'</strong>. Müəssisələrin ayrıca idarəetmə sistemi hələ tamamlanmayıb.'),
 finance:info('Maliyyə və komissiyalar','Maliyyə əməliyyatları üçün təsdiqlənmiş gəlir və xərc məlumat mənbəyi hələ qoşulmayıb. Burada saxta məbləğ göstərilmir.'),
 marketing:info('Marketinq və sosial paylaşım','Instagram/Facebook avtomatik paylaşımı Meta bağlantısı təsdiqlənənədək aktiv deyil. Paylaşım növbəsinin idarəetməsi tamamlanmayıb.'),
 sos:info('SOS və Avtoyuma','Bu xidmətlər üçün idarəetmə əməliyyatları mərhələli qoşulacaq. İstifadəçilərə aktivləşdirmə burada aparılmır.'),
 android:info('Android tətbiqi','APK buildləri, versiya tarixçəsi və yeniləmə idarəetməsi server API-sinə hələ qoşulmayıb.'),
 notifications:info('Bildirişlər və təhlükəsizlik','Telefon bildirişləri və 2FA mövcud admin panelində idarə olunur.<p><button type="button" class="btn" data-open-legacy>Təhlükəsizlik parametrlərini aç</button></p>'),
 legacy:info('Mövcud admin əməliyyatları','Aşağıda bildirişlər, 2FA, moderasiya, şikayətlər və istifadəçi əməliyyatları qorunub.')
 };
 host.innerHTML='<div class="premium-shell"><nav class="premium-nav" aria-label="İdarəetmə bölmələri"><div class="premium-brand">SosAvto <small>İDARƏETMƏ MƏRKƏZİ</small></div><div class="premium-nav-list">'+premiumSections.map(([id,label])=>'<button type="button" data-premium-tab="'+id+'" aria-selected="false">'+escapeHtml(label)+'</button>').join('')+'</div></nav><div class="premium-body"><span class="premium-kicker">SOSAVTO / PREMIUM ADMIN</span>'+premiumSections.map(([id])=>section(id,views[id])).join('')+'</div></div>';
 const legacy=document.querySelector('#admin-content');const existing=[...legacy.children].filter(el=>el!==host);
 const legacyWrap=document.createElement('div');legacyWrap.id='premium-legacy-content';legacyWrap.hidden=true;
 existing.forEach(el=>legacyWrap.append(el));legacy.append(legacyWrap);
 const choose=id=>{host.querySelectorAll('[data-premium-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.premiumTab===id)));host.querySelectorAll('[data-premium-view]').forEach(v=>v.hidden=v.dataset.premiumView!==id);legacyWrap.hidden=id!=='legacy';};
 host.querySelectorAll('[data-premium-tab]').forEach(b=>b.addEventListener('click',()=>choose(b.dataset.premiumTab)));
 host.querySelectorAll('[data-open-legacy]').forEach(b=>b.addEventListener('click',()=>choose('legacy')));
 choose('overview');
 // Other admin components may be prepended after mount; keep them grouped when ready.
 const observer=new MutationObserver(()=>{if(legacyWrap.hidden===false)return;for(const el of [...legacy.children])if(el!==host&&el!==legacyWrap)legacyWrap.prepend(el);});
 observer.observe(legacy,{childList:true});
}

const labels={pending:'Yoxlanış gözləyir',active:'Aktiv',rejected:'Rədd edilib',sold:'Satılıb',archived:'Arxiv'};
export async function mountAdminCommandCenter(root,api){
 const host=document.createElement('section');host.id='admin-command-center';host.className='panel form-section sos-admin-command';host.setAttribute('aria-label','İdarəetmə mərkəzi');
 root.prepend(host);
 host.innerHTML='<h2>İdarəetmə mərkəzi</h2><p class="muted">Real göstəricilər yüklənir…</p>';
 try{
  const data=await api('/admin/overview');
  const status=data.statuses||[],cats=data.categories||[],growth=data.growth||[];
  const stat=(name,n)=>'<div class="stat"><strong>'+Number(n||0).toLocaleString('az-AZ')+'</strong><span>'+escapeHtml(name)+'</span></div>';
  host.innerHTML='<div class="sos-command-heading"><div><span class="sos-command-eyebrow">SOSAVTO / ADMIN</span><h2>İdarəetmə mərkəzi</h2><p class="muted">Real elan bazası · son 30 günün inkişafı</p></div><span class="sos-command-live">● Real məlumatlar</span></div>'+
   '<div class="stats sos-command-stats">'+stat('Ümumi elan',data.total)+stat('Son 30 gündə yeni',data.last30)+stat('Son 7 gündə yeni',data.last7)+stat('Aktiv elan',status.find(x=>x.status==='active')?.count)+'</div>'+
   '<h3>Platforma üzrə əməliyyat göstəriciləri</h3><div class="stats sos-command-stats">'+
   stat('İstifadəçilər',data.operations?.users_total)+stat('Son 7 gündə qeydiyyat',data.operations?.users_last7)+stat('Yoxlanacaq elanlar',data.operations?.listings_pending)+stat('Açıq şikayətlər',data.operations?.reports_open)+stat('Xidmət elanları',data.operations?.service_listings)+stat('Bloklanmış hesablar',data.operations?.users_banned)+stat('Son 7 gündə admin əməliyyatları',data.operations?.admin_actions_last7)+'</div>'+ 
   '<p class="muted">Məlumatlar yalnız admin sessiyası ilə serverdən alınır. Moderasiya, şikayət və istifadəçi əməliyyatları aşağıdakı mövcud admin bölməsində idarə olunur.</p>'+ 
   '<div class="form-actions" style="flex-wrap:wrap"><label class="field">Status <select id="command-status"><option value="">Hamısı</option>'+status.map(x=>'<option value="'+escapeHtml(x.status)+'">'+escapeHtml(labels[x.status]||x.status)+'</option>').join('')+'</select></label>'+
   '<label class="field">Kateqoriya <select id="command-category"><option value="">Hamısı</option>'+cats.map(x=>'<option value="'+escapeHtml(x.category)+'">'+escapeHtml(x.category)+'</option>').join('')+'</select></label></div>'+
   '<div id="command-results" class="table-wrap"></div>'+
   '<h3>Son 30 gündə elan artımı</h3><div class="sos-command-growth" aria-label="Son 30 gündə elan artımı">'+growth.slice(-14).map(x=>'<div class="sos-command-day" title="'+escapeHtml(x.day)+' · '+Number(x.count)+' elan"><span style="height:'+Math.max(4,Math.round(Number(x.count)/Math.max(1,...growth.map(y=>Number(y.count)))*100))+'%"></span></div>').join('')+'</div><div class="table-wrap"><table><thead><tr><th>Tarix</th><th>Yeni elan</th></tr></thead><tbody>'+growth.map(x=>'<tr><td>'+escapeHtml(x.day.slice(0,10))+'</td><td>'+Number(x.count)+'</td></tr>').join('')+'</tbody></table></div>'+
   '<h3>İş mərhələləri</h3><p class="muted">Elanların moderasiyası aktivdir. Sosial paylaşım növbəsi, müəssisə qeydləri və mobil iş izləyicisi növbəti mərhələlərdə verilənlər bazasına qoşulacaq. Meta bağlantısı tamamlanmadan avtomatik paylaşım edilmir.</p>';
  const render=()=>{
   const st=host.querySelector('#command-status').value,cat=host.querySelector('#command-category').value;
   const rows=(data.breakdown||[]).filter(x=>(!st||x.status===st)&&(!cat||x.category===cat));
   host.querySelector('#command-results').innerHTML='<table><thead><tr><th>Kateqoriya</th><th>Status</th><th>Elan sayı</th></tr></thead><tbody>'+rows.map(x=>'<tr><td>'+escapeHtml(x.category)+'</td><td>'+escapeHtml(labels[x.status]||x.status)+'</td><td>'+Number(x.count)+'</td></tr>').join('')+'</tbody></table>';
  };
  host.querySelector('#command-status').addEventListener('change',render);
  host.querySelector('#command-category').addEventListener('change',render);render();
  premiumShell(host,data);
 }catch(e){host.innerHTML='<h2>İdarəetmə mərkəzi</h2><p class="error">'+escapeHtml(e.message||'Göstəricilər yüklənmədi')+'</p>';}
}
