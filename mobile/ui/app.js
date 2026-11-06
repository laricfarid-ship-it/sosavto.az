(() => {
  if (location.origin !== 'https://sosavto.az' || window.__sosavtoHostedUI) return;
  window.__sosavtoAppUI = true;
  window.__sosavtoHostedUI = true;
  document.documentElement.classList.add('sa-app');
  const paths = {
    home:'M3 10 12 3l9 7v11h-6v-7H9v7H3Z',
    map:'M9 18 3 21V5l6-3 6 3 6-3v16l-6 3Zm0 0V2m6 3v16',
    plus:'M12 5v14M5 12h14',
    ai:'m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5ZM20 2v4M18 4h4',
    user:'M20 21v-2a7 7 0 0 0-14 0v2M17 7a5 5 0 1 1-10 0 5 5 0 0 1 10 0',
    heart:'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8'
  };
  const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name]}"></path></svg>`;
  const motorcyclePremium=()=>'<svg class="icon moto-side-icon" viewBox="0 0 64 44" fill="none" aria-hidden="true"><ellipse cx="32" cy="39" rx="29" ry="3" fill="#000" opacity=".24"/><circle cx="13" cy="31" r="10" fill="#111c2b" stroke="#8fa7ba" stroke-width="3"/><circle cx="51" cy="31" r="10" fill="#111c2b" stroke="#8fa7ba" stroke-width="3"/><circle cx="13" cy="31" r="4" fill="#a7c5da"/><circle cx="51" cy="31" r="4" fill="#a7c5da"/><path d="m13 31 14-15 11 15H13l12-10 13 10 13-16" stroke="#b7d8e9" stroke-width="2.6" stroke-linejoin="round"/><path d="M21 15 30 9 44 12 49 19 39 24 28 21 20 24 14 21Z" fill="#158bcf" stroke="#c9f1ff" stroke-width="1.3"/><path d="M32 10 39 5 48 7 44 13Z" fill="#d6ecf8" stroke="#a0c4d9"/><path d="m44 12 7-5h8M20 15l-8-5H6" stroke="#b5d3e4" stroke-width="2.8" stroke-linecap="round"/><path d="M27 21h12l-4 6H24Z" fill="#263f55" stroke="#a4d7ee"/><path d="M18 25h-7m33 0 7-9" stroke="#7fb8d8" stroke-width="2.3"/></svg>';
  const carPremium=()=>'<svg class="icon car-front-premium" viewBox="0 0 64 44" fill="none" aria-hidden="true"><defs><linearGradient id="sa-body" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f3fbff"/><stop offset=".43" stop-color="#9bbbd1"/><stop offset=".75" stop-color="#47769c"/><stop offset="1" stop-color="#d2eaf8"/></linearGradient><linearGradient id="sa-wind" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#152d44"/><stop offset="1" stop-color="#365d78"/></linearGradient></defs><ellipse cx="32" cy="39" rx="27" ry="3" fill="#000" opacity=".25"/><path d="M8 24 14 14Q18 9 24 9h16q7 0 11 7l5 8v10q0 3-3 3H11q-3 0-3-3Z" fill="url(#sa-body)" stroke="#d6effe" stroke-width="1.3"/><path d="m16 22 5-10h22l5 10Z" fill="url(#sa-wind)" stroke="#b9d8e9" stroke-width="1.1"/><path d="M32 12v10" stroke="#87a7bb" stroke-width=".8"/><path d="M9 25h46v9H9Z" fill="#527b99" stroke="#c2e4f8" stroke-width=".8"/><path d="M11 25h14l-3 5H11ZM39 25h14v5H42Z" fill="#d6f6ff" stroke="#7dcfff" stroke-width=".8"/><path d="M25 27h14l-2 6H27Z" fill="#172e42" stroke="#9ec6dd" stroke-width=".7"/><path d="M13 35h11v3H13ZM40 35h11v3H40Z" fill="#111e2b"/><path d="M19 11h26" stroke="#fff" stroke-width=".9" opacity=".55"/><path d="M11 33h42" stroke="#b6d9ee" stroke-width=".8"/></svg>';
  function mount() {
    if (!document.body) return;
    if (!document.getElementById('sa-bottom')) {
      const nav = document.createElement('nav');
      nav.id = 'sa-bottom'; nav.className = 'sa-bottom'; nav.setAttribute('aria-label','Tətbiq naviqasiyası');
      const page = location.pathname.split('/').pop() || 'index.html';
      const account = document.querySelector('.nav-actions>a')?.getAttribute('href') || 'giris.html';
      nav.innerHTML = [['index.html','home','Ana səhifə'],['xarita.html','map','Xəritə'],['elan-ver.html','plus','Elan ver'],['ai.html','ai','AI köməkçi'],[account,'user','Hesabım']].map(([href,i,label]) => `<a href="/${href}" ${page===href?'aria-current="page"':''} ${i==='plus'?'class="sa-create"':''}>${icon(i)}<span>${label}</span></a>`).join('');
      document.body.append(nav);
    }
    // Auth renders asynchronously. Follow its existing account link, never infer roles.
    const accountLink = document.querySelector('.nav-actions>a');
    const profile = document.querySelector('#sa-bottom a:last-child');
    if (accountLink && profile) {
      const href = accountLink.getAttribute('href');
      if (profile.getAttribute('href') !== '/'+href) profile.setAttribute('href','/'+href);
    }
    const actions = document.querySelector('.nav-actions');
    if (actions && !document.querySelector('.sa-favorite')) {
      const link = document.createElement('a'); link.className='sa-favorite'; link.href='/favoriler.html'; link.setAttribute('aria-label','Seçilmişlər'); link.innerHTML=icon('heart');
      actions.before(link);
    }
    const form=document.getElementById('search');
    if (form && !form.querySelector('.sa-filters')) {
      const details=document.createElement('details'); details.className='sa-filters';
      const summary=document.createElement('summary'); summary.textContent='Filtrlər · marka, qiymət, kuzov'; details.append(summary);
      const query=new URLSearchParams(location.search);
      details.open=[...query.keys()].some(key=>!['q','category','sort','page'].includes(key));
      for (const node of [...form.children]) if(node.matches('.body-choices,.fields,.price-distribution,.advanced')) details.append(node);
      form.querySelector('.search-line').after(details);
      // Retain native browser validation for fields inside a collapsed disclosure.
      form.addEventListener('invalid',()=>{details.open=true;},true);
    }
    // APK-only: keep the full category list on the website, but use 4x2 in the app.
    if (location.pathname === '/' || location.pathname.endsWith('/index.html')) {
      document.querySelectorAll('.home-intro .categories .category, .categories .category').forEach(category => {
        const label = category.textContent.replace(/\\s+/g, ' ').trim().toLocaleLowerCase('az');
        category.classList.toggle('sa-app-all-category', label === 'bütün elanlar');
        if (label === 'avtomobillər' && !category.querySelector('.car-front-premium')) {
          const oldIcon=category.querySelector('svg.icon'); if(oldIcon) oldIcon.outerHTML=carPremium();
        }
        if (label === 'motosikletlər' && !category.querySelector('.moto-side-icon')) {
          const oldIcon=category.querySelector('svg.icon'); if(oldIcon) oldIcon.outerHTML=motorcyclePremium();
        }
      });
      const grid=document.querySelector('.home-intro .categories, .categories');
      if (grid && ![...grid.querySelectorAll('.category')].some(el=>el.textContent.trim().toLocaleLowerCase('az')==='motosikletlər')) {
        const car=[...grid.querySelectorAll('.category')].find(el=>el.textContent.trim().toLocaleLowerCase('az')==='avtomobillər');
        if (car) {
          const moto=document.createElement('a');moto.className='category sa-app-motorcycle';
          moto.href='/index.html?category=motorcycle';moto.innerHTML=motorcyclePremium()+'<span>Motosikletlər</span>';
          car.after(moto);
        }
      }
    }
    const intro=document.querySelector('.home-intro');
    const ad=document.querySelector('.technol-left');
    if(intro && ad && intro.nextElementSibling!==ad) intro.after(ad);
  }
  let scheduled=false, frame=0;
  const observer=new MutationObserver(()=>{
    if(scheduled)return; scheduled=true;
    frame=requestAnimationFrame(()=>{scheduled=false;mount();});
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('pagehide',()=>{observer.disconnect();cancelAnimationFrame(frame);},{once:true});
  mount();
  const viewport=window.visualViewport;
  if(viewport){
    const height=window.innerHeight;
    viewport.addEventListener('resize',()=>document.body?.classList.toggle('sa-keyboard',height-viewport.height>160));
  }
})();
