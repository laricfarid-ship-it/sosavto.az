// Admin-only command center. All figures come from /api/admin/overview; no sample data.
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={pending:'Yoxlanış gözləyir',active:'Aktiv',rejected:'Rədd edilib',sold:'Satılıb',archived:'Arxiv'};
export async function mountAdminCommandCenter(root,api){
 const host=document.createElement('section');host.id='admin-command-center';host.className='panel form-section';host.setAttribute('aria-label','İdarəetmə mərkəzi');
 root.prepend(host);
 host.innerHTML='<h2>İdarəetmə mərkəzi</h2><p class="muted">Real göstəricilər yüklənir…</p>';
 try{
  const data=await api('/admin/overview');
  const status=data.statuses||[],cats=data.categories||[],growth=data.growth||[];
  const stat=(name,n)=>'<div class="stat"><strong>'+Number(n||0).toLocaleString('az-AZ')+'</strong><span>'+escapeHtml(name)+'</span></div>';
  host.innerHTML='<h2>İdarəetmə mərkəzi</h2><p class="muted">Real elan bazası · son 30 günün inkişafı</p>'+
   '<div class="stats">'+stat('Ümumi elan',data.total)+stat('Son 30 gündə yeni',data.last30)+stat('Son 7 gündə yeni',data.last7)+stat('Aktiv elan',status.find(x=>x.status==='active')?.count)+'</div>'+
   '<h3>Platforma üzrə əməliyyat göstəriciləri</h3><div class="stats">'+
   stat('İstifadəçilər',data.operations?.users_total)+stat('Son 7 gündə qeydiyyat',data.operations?.users_last7)+stat('Yoxlanacaq elanlar',data.operations?.listings_pending)+stat('Açıq şikayətlər',data.operations?.reports_open)+stat('Xidmət elanları',data.operations?.service_listings)+stat('Bloklanmış hesablar',data.operations?.users_banned)+stat('Son 7 gündə admin əməliyyatları',data.operations?.admin_actions_last7)+'</div>'+ 
   '<p class="muted">Məlumatlar yalnız admin sessiyası ilə serverdən alınır. Moderasiya, şikayət və istifadəçi əməliyyatları aşağıdakı mövcud admin bölməsində idarə olunur.</p>'+ 
   '<div class="form-actions" style="flex-wrap:wrap"><label class="field">Status <select id="command-status"><option value="">Hamısı</option>'+status.map(x=>'<option value="'+escapeHtml(x.status)+'">'+escapeHtml(labels[x.status]||x.status)+'</option>').join('')+'</select></label>'+
   '<label class="field">Kateqoriya <select id="command-category"><option value="">Hamısı</option>'+cats.map(x=>'<option value="'+escapeHtml(x.category)+'">'+escapeHtml(x.category)+'</option>').join('')+'</select></label></div>'+
   '<div id="command-results" class="table-wrap"></div>'+
   '<h3>Son 30 gündə elan artımı</h3><div class="table-wrap"><table><thead><tr><th>Tarix</th><th>Yeni elan</th></tr></thead><tbody>'+growth.map(x=>'<tr><td>'+escapeHtml(x.day.slice(0,10))+'</td><td>'+Number(x.count)+'</td></tr>').join('')+'</tbody></table></div>'+
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
