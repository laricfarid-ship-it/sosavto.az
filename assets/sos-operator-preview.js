export function mountSosOperatorPreview(main) {
  const host = document.createElement("section");
  const root = host.attachShadow({mode:"open"});
  const style = document.createElement("style");
  style.textContent = ".sos-page{max-width:1180px}.sos-top{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:28px}.sos-wordmark{font-weight:750;letter-spacing:.12em;font-size:12px}.sos-wordmark span{display:inline-block;background:var(--sos-solid);color:var(--on-sos);padding:9px 12px;border-radius:8px;font-size:18px;letter-spacing:-.06em;margin-right:8px}.sos-top nav{display:flex;gap:8px}.sos-top nav a{padding:10px 16px;border-radius:24px;background:var(--panel2)}.sos-top nav [aria-current]{background:color-mix(in srgb,var(--text) 14%,var(--panel));color:var(--text)}.sos-hero{padding:42px 0 36px;max-width:800px}.sos-hero h1{font-size:clamp(2.5rem,6vw,4.5rem);line-height:1.04;letter-spacing:-.045em;margin:18px 0}.sos-hero>p:not(.eyebrow){font-size:17px;max-width:570px;color:var(--muted);line-height:1.7}.sos-chips{display:flex;flex-wrap:wrap;gap:12px 24px;font-size:12px;color:var(--text-soft);margin-top:26px}.sos-layout{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(240px,1fr);gap:24px;align-items:start;margin-top:24px}.sos-page h2{font-size:24px;margin-bottom:22px}.sos-page .panel{padding:26px}.sos-problems{border:0;padding:0;margin:18px 0 30px;display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.sos-problems label{position:relative}.sos-problems input{position:absolute;opacity:0;width:1px;height:1px}.sos-problems span{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:12px;border:1px solid var(--line);background:var(--bg);border-radius:12px;padding:16px;min-height:112px;cursor:pointer;font-size:13px}.sos-problems b{font-size:24px;color:var(--sos-ink)}.sos-problems input:checked+span{border-color:var(--sos-line);background:var(--sos-bg);color:var(--text)}.sos-problems input:focus-visible+span{outline:3px solid var(--text);outline-offset:2px}.sos-page .field{margin-top:16px}.sos-map{height:220px;border-radius:12px;background:var(--panel2);margin:20px 0;z-index:0}.sos-map>p{padding:24px}.sos-page details{margin:16px 0;color:var(--muted)}.sos-page summary{cursor:pointer}.sos-call{width:100%;background:var(--sos-solid);color:var(--on-sos);font-weight:750;margin-top:12px;min-height:52px}.sos-how ol{list-style:none;padding:0;counter-reset:steps}.sos-how li{counter-increment:steps;position:relative;padding:0 0 28px 42px}.sos-how li:before{content:counter(steps);position:absolute;left:0;top:0;border:1px solid var(--line-strong);border-radius:50%;width:27px;height:27px;display:grid;place-items:center;color:var(--sos-ink)}.sos-how li span{display:block;font-size:13px;color:var(--muted);margin-top:7px;line-height:1.6}.sos-how .muted{font-size:12px;line-height:1.8}.sos-section{margin-top:36px}.sos-order{margin-bottom:16px}.sos-order h3{font-size:22px;margin-top:18px}.sos-order p{line-height:1.7}.sos-price{display:flex;flex-direction:column;gap:8px;padding:18px;background:var(--ok-bg);border-radius:10px;margin-top:16px}.sos-price strong{font-size:28px}.sos-price span{font-size:13px}.sos-specialties{display:grid;gap:12px;padding:16px;border:1px solid var(--line-strong);margin:18px 0}.sos-specialties input{width:auto}.sos-page #sos-network:not(:empty){padding:18px;background:var(--sos-bg2);border-radius:10px}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}@media(max-width:760px){.sos-layout{grid-template-columns:1fr}.sos-layout aside{order:2}.sos-hero{padding:15px 0 24px}.sos-page .panel{padding:18px}.sos-problems{grid-template-columns:repeat(2,1fr)}.sos-top{align-items:flex-start;flex-direction:column}.sos-order .row{flex-wrap:wrap}.sos-page .fields{grid-template-columns:1fr 1fr}.sos-chips{gap:12px}.sos-problems span{min-height:100px}}\n\n.sos-category-icon{width:42px;height:42px;padding:8px;border:1px solid var(--sos-line,#435c80);border-radius:12px;background:var(--sos-bg2,#182b46);color:var(--sos-ink,#9bc7ff);flex:none}\n.sos-problems label>span{height:100%;font-size:.875rem;font-weight:650}\n\n\n*{box-sizing:border-box}:host{display:block;margin:0;background:#090f1b;color:#eff5ff;font:16px/1.55 system-ui,sans-serif;--line:#293b53;--bg:#101b2d;--sos-line:#659ee9;--sos-bg:#203b62}main{width:min(1060px,calc(100% - 36px));margin:0 auto;padding:32px 0 60px}header,nav,.actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap}header{justify-content:space-between}strong.brand{letter-spacing:.08em}.brand b{color:#86baff}small,.muted{color:#adc0dc}h1{font-size:clamp(2.1rem,6vw,4rem);letter-spacing:-.045em;line-height:1.07;margin:24px 0 12px}h2{margin:0 0 12px;font-size:1.32rem}.grid{display:grid;grid-template-columns:minmax(0,2fr) minmax(230px,1fr);gap:16px;margin-top:20px}.card{border:1px solid #293b53;border-radius:18px;background:#111c2e;padding:22px;min-width:0}.sos-problems span{min-height:105px}.sos-problems{margin-bottom:18px}button,input,textarea,select{font:inherit}button{background:#243c5e;color:#f3f8ff;border:1px solid #52709a;border-radius:9px;padding:9px 13px;cursor:pointer}button.primary,button[aria-pressed=true]{background:#a5cfff;color:#081426;border-color:#a5cfff;font-weight:700}label:not(.sos-problems label){display:block;margin:10px 0}input:not([type=radio]),textarea,select{display:block;width:100%;margin-top:4px;padding:9px;background:#0a1424;border:1px solid #50698b;color:#f3f8ff;border-radius:8px}textarea{min-height:72px}dl{display:grid;grid-template-columns:1fr auto;gap:7px 12px}dd{margin:0;font-weight:700}ol{padding-left:20px}li{margin-bottom:8px}.amount{font-size:2.2rem;font-weight:750;margin:0}.actions{margin-top:15px}a{color:#a5cfff}@media(max-width:700px){.grid{grid-template-columns:1fr}.card{padding:16px}}\n";
  const content = document.createElement("main");
  content.innerHTML = "\n<header><strong class=\"brand\"><b>SOS</b> YOL YARDIMI</strong><small>Sınaq rejimi · real ödəniş və zəng yoxdur</small></header>\n<h1>Yolda qalmısan?</h1>\n<p class=\"muted\">Problemi seç. SosAvto operatoru zəng edib səni uyğun ustaya yönləndirsin.</p>\n<nav aria-label=\"Sınaq rolları\"></nav>\n<div class=\"grid\"><section class=\"card\" id=\"work\"></section><aside class=\"card\" id=\"summary\" aria-live=\"polite\"></aside></div>\n";
  root.append(style, content);
  main.append(host);
  const labels = {
    tire: 'Təkər deşilib',
    battery: 'Akkumulyator bitib',
    fuel: 'Yanacaq bitib',
    engine: 'Mühərrik problemi',
    accident: 'Qəza / evakuator',
    other: 'Digər',
  };

  const drawings = {
    tire: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="m12 3 2 3m6 2-3 2m1 9-3-2m-8 2 1-3M3 11l3 1"/>',
    battery: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M7 7V4m10 3V4M6 13h4m-2-2v4m6-2h4"/>',
    fuel: '<path d="M3 21h12M5 21V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v16M5 11h8m0 3h2a2 2 0 0 1 2 2v2a2 2 0 0 0 4 0v-7l-4-4"/>',
    engine: '<path d="M7 7h9l2 3h3v8h-4l-2 2H8l-3-4H3V9h2zm3 0V4m-3 0h6M1 10v5"/>',
    accident: '<path d="M2 16h20v-4h-5l-2-4h-4v8M3 11l7-6m0 0v6m0 0H7"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
    other: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2l-1 .8c-.5.4-.5.8-.5 1.2m0 3h.01"/>',
  };

  function categoryIcon(key) {
    return `<svg class="sos-category-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${drawings[key] || drawings.other}</svg>`;
  }

  const roles = {driver: 'Müştəri', operator: 'Operator', master: 'Usta'};
  const flow = {
    start: ['driver', 'Nə baş verib?', 'İlk SOS sorğunu yarat.'],
    call: ['operator', 'Zənglə dəqiqləşdir', 'Müştərinin dediklərini və təxmini qiyməti sifarişə yaz.'],
    quote: ['master', 'Qiymət təklifi', 'Gəliş haqqını, iş haqqını və çatma vaxtını yaz.'],
    offer: ['operator', 'Təklifi yoxla', 'Ustanın təklifini nəzərdən keçir və müştəriyə göndər.'],
    pay: ['driver', 'Təklifi təsdiqlə', 'Sınaq ödənişindən sonra usta ünvanı görəcək.'],
    travel: ['master', 'Usta yoldadır', 'Ünvana çatanda sifarişdə qeyd et.'],
    work: ['master', 'İşin nəticəsi', 'Əlavə iş üçün qiymət təklifi göndər və ya işin nəticəsini yaz.'],
    extra: ['driver', 'Əlavə işi təsdiqlə', 'Əlavə işə razısansa, sifarişdə sınaq ödənişi et.'],
    finish: ['driver', 'İşi yoxla', 'İş tamamlanıbsa, ödəniş bölgüsünü təsdiqlə.'],
    review: ['operator', 'Ləğv və ya mübahisə', 'Müştərinin və ustanın məlumatlarını yoxla. Qərar sifariş tarixçəsində qalır.'],
    closed: ['driver', 'Sifariş bağlandı', 'Ödəniş və qərarlar tarixçədə görünür.'],
  };
  const fresh = () => ({step:'start', role:'driver', paid:0, refund:0, deposit:2500, flags:{driver:0, master:0}, log:[]});
  let order = fresh();
  const nav = root.querySelector('nav');
  const work = root.querySelector('#work');
  const summary = root.querySelector('#summary');
  const money = amount => (amount / 100).toFixed(2) + ' AZN';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]);
  const button = (action, label, primary = false) => `<button type="submit" value="${action}" class="${primary ? 'primary' : ''}">${label}</button>`;
  const field = (name, label, attrs = 'required maxlength="180"') => `<label>${label}<input name="${name}" ${attrs}></label>`;
  const fee = (name, title, initial) => field(name, title, `type="number" required min="0" max="1000" step=".01" value="${initial}"`);
  const alternative = {callFee:500, labor:1900, eta:12};
  const total = () => (order.callFee || 0) + (order.labor || 0);
  const price = () => `<p class="amount">${money(total())}</p><p>Gəliş ${money(order.callFee)} · İş ${money(order.labor)} · ${order.eta} dəqiqə</p>`;
  const reason = () => '<label>Səbəb<select name="reason" required><option value="">Seçin</option><option>Usta gəlmədi</option><option>Yerində həll mümkün olmadı</option><option>Saytdan kənar ödəniş istəndi</option><option>Plan dəyişdi</option></select></label>';
  const screens = {
    start: () => `<fieldset class="sos-problems"><legend class="sr-only">SOS kateqoriyası</legend>${Object.entries(labels).map(([key, label]) => `<label><input type="radio" name="category" value="${key}" required${key === 'battery' ? ' checked' : ''}><span>${categoryIcon(key)}${label}</span></label>`).join('')}</fieldset>${field('address','Ünvan','required maxlength="180" value="Nərimanov, Bakı · sınaq ünvanı"')}${field('description','Qısa məlumat','maxlength="180" placeholder="Maşın işə düşmür"')}${button('create','Operator zəngi istə',true)}`,
    call: () => `<p>Ünvan · ${escape(order.address)}</p>${field('note','Zəngin nəticəsi')}${fee('estimate','Təxmini qiymət (AZN)',20)}${button('dispatch','Sorğunu ustaya göndər',true)}`,
    quote: () => order.flags.master >= 2 ? '<p>Ustanın yeni sifarişləri operator yoxlamasına qədər dayandırılıb.</p>' : `<p>${escape(order.note)} · Təxmini ${money(order.estimate)}</p>${fee('callFee','Gəliş haqqı (AZN)',5)}${fee('labor','İş haqqı (AZN)',15)}${field('eta','Çatma müddəti (dəqiqə)','type="number" required min="1" max="180" value="20"')}${button('quote','Təklifi operatora göndər',true)}`,
    offer: () => `<label>Usta təklifləri<select name="offer"><option value="first">Usta 1 · ${money(total())} · ${order.eta} dəqiqə</option><option value="second">Usta 2 (nümunə) · 24.00 AZN · 12 dəqiqə</option></select></label>` + button('offer','Seçilən təklifi müştəriyə göndər',true),
    pay: () => price() + '<p>Ödəniş üsulu: bank kartı. Ləğv və mübahisələr operator tərəfindən yoxlanır. Çatma təsdiqlənərsə, gəliş haqqı saxlanıla bilər. Geri ödəniş ödəniş edilən karta yönləndirilir.</p>' + button('pay','Kartla sınaq ödənişi et',true),
    travel: () => `<p>Ünvan · ${escape(order.address)}</p>${field('code','Müştərinin çatma kodu','required inputmode="numeric" pattern="[0-9]{4}" maxlength="4"')}${button('arrive','Çatma kodunu təsdiqlə',true)}`,
    work: () => `<p>Ünvan · ${escape(order.address)}</p>${field('item','Əlavə işin adı','maxlength="180"')}${fee('extraFee','Əlavə ödəniş (AZN)',10)}<div class="actions">${button('extra','Əlavə təklif göndər')}${button('finish','İş görüldü',true)}${button('unresolved','Yerində həll olunmadı')}</div>`,
    extra: () => `<p>${escape(order.item)} · ${money(order.extraFee)}</p><div class="actions">${button('extraPay','Əlavə işi kartla ödə (sınaq)',true)}${button('decline','Təklifi rədd et')}</div>`,
    finish: () => `<div class="actions">${button('complete','İş tamamlandı',true)}${button('dispute','Problem bildir')}</div>`,
    review: () => `<p>${escape(order.reason)}</p><div class="actions">${button('refundAll','Tam geri ödəniş')}${order.arrived ? button('refundWork','İş haqqını qaytar') : ''}${button('fraud','Təsdiqlənmiş aldatma')}${order.cancelRole ? button('unjustified','Əsassız imtinanı qeyd et') : ''}</div>`,
    closed: () => button('reset','Yeni sınaq başlat',true),
  };

  function go(step, message) {
    order.step = step;
    order.role = flow[step][0];
    order.log.push(message);
    render();
  }

  function render() {
    const [role, title, help] = flow[order.step];
    nav.innerHTML = Object.entries(roles).map(([key, label]) => `<button type="button" data-role="${key}" aria-pressed="${order.role === key}">${label}</button>`).join('');
    const canCancel = ['pay','travel','work','extra','finish'].includes(order.step) && order.role !== 'operator';
    work.innerHTML = `<h2>${title}</h2><p class="muted">${help}</p>${order.role === role ? `<form id="stage">${screens[order.step]()}</form>` : `<p>Növbəti addımı <strong>${roles[role]}</strong> yerinə yetirir.</p>`}${order.step === 'travel' && order.role === 'driver' ? `<p>Ustaya yalnız ünvana çatanda de: <strong>${order.arrivalCode}</strong></p>` : ''}${canCancel ? `<details><summary>Sifarişi ləğv et</summary><form id="cancel">${reason()}${button('cancel','Səbəbi göndər')}</form></details>` : ''}<p id="error" role="alert"></p>`;
    summary.innerHTML = `<h2>Sifariş tarixçəsi</h2>${order.category ? `<p>${labels[order.category]}</p>` : ''}<dl><dt>Kartla ödəniş (sınaq)</dt><dd>${money(order.paid)}</dd><dt>Karta geri ödəniş (sınaq)</dt><dd>${money(order.refund)}</dd><dt>SosAvto payı</dt><dd>${money(order.share || 0)}</dd><dt>Usta qazancı</dt><dd>${money(order.earnings || 0)}</dd>${order.role !== 'driver' ? `<dt>Usta depoziti</dt><dd>${money(order.deposit)}</dd>` : ''}</dl>${order.flags.driver || order.flags.master ? `<p>Əsassız imtina · Müştəri ${order.flags.driver} · Usta ${order.flags.master}</p>` : ''}<ol>${order.log.map(item => `<li>${escape(item)}</li>`).join('')}</ol>`;
  }

  nav.onclick = event => {
    const role = event.target.dataset.role;
    if (role) { order.role = role; render(); }
  };

  work.onsubmit = event => {
    event.preventDefault();
    const form = new FormData(event.target);
    const action = event.submitter.value;
    const amount = name => Math.round(Number(form.get(name)) * 100);
    switch (action) {
      case 'create':
        Object.assign(order, {category:form.get('category'), address:form.get('address')});
        return go('call', 'SOS sorğusu açıldı. ' + form.get('description'));
      case 'dispatch':
        Object.assign(order, {note:form.get('note'), estimate:amount('estimate')});
        return go('quote', 'Operator zəngi qeyd etdi və sorğunu göndərdi.');
      case 'quote':
        Object.assign(order, {callFee:amount('callFee'), labor:amount('labor'), eta:Number(form.get('eta'))});
        if (!total()) { root.querySelector('#error').textContent = 'Məbləğ sıfırdan böyük olmalıdır.'; return; }
        return go('offer', 'Usta ' + money(total()) + ' təklif etdi.');
      case 'offer':
        if (form.get('offer') === 'second') Object.assign(order, alternative);
        return go('pay', 'Operator seçilmiş təklifi göndərdi: ' + money(total()) + '.');
      case 'pay':
        order.arrivalCode = String(1000 + crypto.getRandomValues(new Uint32Array(1))[0] % 9000);
        order.paid = total(); return go('travel', 'Kartla sınaq ödənişi təsdiqləndi. Ustaya ünvan açıldı.');
      case 'arrive':
        if (form.get('code') !== order.arrivalCode) { root.querySelector('#error').textContent = 'Çatma kodu düzgün deyil.'; return; }
        order.arrivalCode = null;
        order.arrived = true; return go('work', 'Çatma birdəfəlik kodla təsdiqləndi.');
      case 'extra':
        if (!form.get('item').trim() || !amount('extraFee')) { root.querySelector('#error').textContent = 'Əlavə işin adını və qiymətini yazın.'; return; }
        Object.assign(order, {item:form.get('item').trim(), extraFee:amount('extraFee')});
        return go('extra', 'Əlavə təklif: ' + order.item + ' · ' + money(order.extraFee));
      case 'extraPay': order.paid += order.extraFee; return go('work', 'Əlavə işin sınaq ödənişi təsdiqləndi.');
      case 'decline': return go('work', 'Müştəri əlavə təklifi rədd etdi.');
      case 'finish': return go('finish', 'Usta işi tamamladığını bildirdi.');
      case 'complete':
        order.share = order.callFee;
        order.earnings = order.paid - order.share;
        return go('closed', 'Müştəri işi təsdiqlədi. Nümunə bölgü hesablandı.');
      case 'unresolved':
      case 'dispute':
      case 'cancel':
        order.cancelRole = action === 'cancel' ? order.role : null;
        order.reason = form.get('reason') || (action === 'dispute' ? 'Müştəri nəticəyə etiraz etdi.' : 'Usta yerində həllin mümkün olmadığını bildirdi.');
        return go('review', order.reason);
      case 'refundAll': order.refund = order.paid; return go('closed', 'Operator tam sınaq geri ödənişini təsdiqlədi.');
      case 'refundWork':
        order.share = Math.min(order.callFee, order.paid);
        order.refund = order.paid - order.share;
        return go('closed', 'Operator gəliş haqqını saxladı və qalan ödənişi qaytardı.');
      case 'fraud':
        order.refund = order.paid;
        order.deposit -= Math.min(500, order.deposit);
        return go('closed', 'Operator aldatmanı təsdiqlədi. Depozit üzrə sınaq əməliyyatı qeydə alındı.');
      case 'unjustified': {
        const party = order.cancelRole;
        const count = ++order.flags[party];
        order.refund = order.paid;
        return go('closed', roles[party] + (count === 1 ? ' xəbərdarlıq aldı.' : party === 'master' ? ' üçün yeni sifarişlər dayandırıldı.' : ' üçün etibarlılıq göstəricisi aşağı düşdü.'));
      }
      case 'reset':
        order = {...fresh(), deposit:order.deposit, flags:order.flags};
        return render();
    }
  };

  render();
}
