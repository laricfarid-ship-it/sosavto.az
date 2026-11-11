
const target=document.getElementById('salon'),slug=new URLSearchParams(location.search).get('slug')||'';
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))target.textContent='Salon tapılmadı.';
else fetch('/api/dealerships/'+encodeURIComponent(slug)).then(async r=>{if(!r.ok)throw Error('Salon tapılmadı.');return r.json()}).then(({profile:p,listings})=>{
 document.title=p.display_name+' — SosAvto.az';
 target.innerHTML='<div class="salon-hero">'+(p.banner_url?'<img class="salon-banner" src="'+escapeHtml(p.banner_url)+'" alt="">':'')+(p.logo_url?'<img class="salon-logo" src="'+escapeHtml(p.logo_url)+'" alt="Salon loqosu">':'')+'<p>✓ Təsdiqlənmiş avtosalon</p><h1>'+escapeHtml(p.display_name)+'</h1><p>'+escapeHtml(p.city)+' · '+escapeHtml(p.address)+'</p><p>'+escapeHtml(p.description)+'</p>'+(p.public_phone?'<a class="btn primary" href="tel:'+encodeURIComponent(p.public_phone)+'">Zəng et</a>':'')+'</div><h2>Aktiv avtomobillər ('+listings.length+')</h2><div class="salon-cards">'+listings.map(l=>'<article class="salon-card"><h3><a href="/elan?id='+encodeURIComponent(l.id)+'">'+escapeHtml(l.title)+'</a></h3><p>'+escapeHtml(l.brand)+' '+escapeHtml(l.model)+' · '+escapeHtml(l.year||'')+'</p><strong>'+escapeHtml(l.price)+' AZN</strong></article>').join('')+'</div>';
}).catch(e=>target.textContent=e.message);
