// Admin-only command center. All figures come from /api/admin/overview; no sample data.
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const commandStyle=document.createElement('style');commandStyle.textContent=`#admin-command-center.sos-admin-command{background:linear-gradient(145deg,#102430,#0b1825);border:1px solid #315061;border-radius:18px;padding:clamp(16px,2.5vw,30px);box-shadow:0 16px 45px #0002}#admin-command-center .sos-command-heading{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:24px}#admin-command-center .sos-command-heading h2{margin:5px 0}#admin-command-center .sos-command-eyebrow{font-size:11px;letter-spacing:2px;color:#76adba}#admin-command-center .sos-command-live{font-size:12px;color:#69e3c4;border:1px solid #35665e;border-radius:30px;padding:7px 11px}#admin-command-center .sos-command-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:16px 0 25px}#admin-command-center .sos-command-stats .stat{border:1px solid #31505e;border-radius:13px;padding:18px;background:#122b39;min-width:0}#admin-command-center .sos-command-stats .stat strong{display:block;font-size:clamp(21px,2.5vw,30px);color:#6ce5c7}#admin-command-center .sos-command-stats .stat span{display:block;color:#a9c5ce;font-size:12px;margin-top:8px}#admin-command-center .sos-command-growth{display:flex;align-items:end;gap:8px;height:130px;border-bottom:1px solid #355867;margin:15px 0 20px}#admin-command-center .sos-command-day{flex:1;height:100%;display:flex;align-items:end}#admin-command-center .sos-command-day span{width:100%;background:linear-gradient(#6ce8c6,#1b817a);border-radius:5px 5px 0 0;min-height:4px}#admin-command-center h3{margin:25px 0 12px}@media(max-width:950px){#admin-command-center .sos-command-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:450px){#admin-command-center .sos-command-stats{gap:8px}#admin-command-center .sos-command-stats .stat{padding:12px}}`;document.head.append(commandStyle);
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
 }catch(e){host.innerHTML='<h2>İdarəetmə mərkəzi</h2><p class="error">'+escapeHtml(e.message||'Göstəricilər yüklənmədi')+'</p>';}
}
