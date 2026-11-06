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
    // Keep the primary search fields visible in the Android app, just like the website.
    // The site already renders secondary controls inside its own "Əlavə filtrlər" disclosure.
    const form=document.getElementById('search');
    if (form) {
      const legacy=form.querySelector(':scope > .sa-filters');
      if (legacy) {
        for (const child of [...legacy.children]) if(child.tagName!=='SUMMARY') legacy.before(child);
        legacy.remove();
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
