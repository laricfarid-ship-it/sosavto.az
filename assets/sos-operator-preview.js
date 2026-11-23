export function mountSosOperatorPreview(main, mapLibrary) {
  const host = document.createElement("section");
  const root = host.attachShadow({mode:"open"});
  const style = document.createElement("style");
  style.textContent = `
    :host {
      display: block;
      color: var(--text);
      font: inherit;
      line-height: 1.55;
      --preview-tint: color-mix(in srgb, var(--accent) 12%, var(--panel));
      --preview-edge: color-mix(in srgb, var(--accent) 52%, var(--line-strong));
      --preview-blue: color-mix(in srgb, var(--accent) 68%, var(--text));
    }
    * { box-sizing: border-box; }
    main { padding: clamp(18px, 3vw, 34px) 0 48px; }
    header, nav, .actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    header { justify-content: space-between; }
    .brand { letter-spacing: .08em; }
    .brand b, a { color: var(--preview-blue); }
    small, .muted { color: var(--muted); }
    h1 { font-size: clamp(2.1rem, 6vw, 4rem); letter-spacing: -.045em; line-height: 1.07; margin: 20px 0 12px; }
    h2 { margin: 0 0 12px; font-size: 1.32rem; }
    .grid { display: grid; grid-template-columns: minmax(0,2fr) minmax(230px,1fr); gap: 16px; margin-top: 20px; }
    .card { min-width: 0; padding: 22px; border: 1px solid var(--line); border-radius: 18px; background: var(--panel); }
    .sos-problems { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 10px; border: 0; margin: 18px 0; padding: 0; }
    .sos-problems label { position: relative; margin: 0; }
    .sos-problems input, .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
    .sos-problems span {
      display: flex; min-height: 104px; height: 100%; flex-direction: column; gap: 10px;
      align-items: flex-start; justify-content: center; padding: 12px;
      border: 1px solid var(--line); border-radius: 12px; background: var(--panel2);
      color: var(--text); font-size: .875rem; font-weight: 650; cursor: pointer;
    }
    .sos-problems input:checked + span, .sos-problems label:hover span {
      border-color: var(--preview-edge); background: var(--preview-tint);
    }
    .sos-problems input:focus-visible + span, button:focus-visible {
      outline: 2px solid var(--preview-blue); outline-offset: 3px;
    }
    .sos-category-icon {
      width: 42px; height: 42px; padding: 8px; flex: none; border-radius: 12px;
      color: var(--preview-blue); border: 1px solid var(--preview-edge);
      background: linear-gradient(145deg, var(--panel), var(--preview-tint) 55%, var(--panel2));
      box-shadow: inset 0 1px 0 color-mix(in srgb, white 45%, transparent),
        0 2px 10px color-mix(in srgb, var(--accent) 23%, transparent);
    }
    button, input, textarea, select { font: inherit; }
    button {
      background: var(--panel2); color: var(--text); border: 1px solid var(--line-strong);
      border-radius: 9px; padding: 9px 13px; cursor: pointer;
    }
    button.primary, button[aria-pressed="true"] {
      background: var(--preview-tint); color: var(--text); border-color: var(--preview-edge); font-weight: 700;
    }
    label { display: block; margin: 10px 0; }
    input:not([type=radio]), textarea, select {
      display: block; width: 100%; margin-top: 4px; padding: 9px;
      background: var(--bg); border: 1px solid var(--line-strong); color: var(--text); border-radius: 8px;
    }
    textarea { min-height: 72px; }
    dl { display: grid; grid-template-columns: 1fr auto; gap: 7px 12px; }
    dd { margin: 0; font-weight: 700; }
    ol { padding-left: 20px; }
    li { margin-bottom: 8px; }
    .amount { font-size: 2.2rem; font-weight: 750; margin: 0; }
    .actions { margin-top: 15px; }
    .checkout { margin-top: 16px; padding: 16px; border: 1px solid var(--line-strong); border-radius: 12px; background: var(--panel2); }
    .checkout h3 { margin-top: 0; }
    .checkout button { min-height: 44px; }
    .checkout label input[type=checkbox] { display: inline; width: auto; margin: 0 6px 0 0; }
    .location-map { height: clamp(230px, 40vw, 320px); margin: 10px 0; border: 1px solid var(--line); border-radius: 12px; background: var(--panel2); }
    .locate { min-height: 44px; }
    .locate svg { width: 1.2em; height: 1.2em; vertical-align: -.2em; margin-right: 5px; }
    .messages { margin-top: 20px; padding-top: 12px; border-top: 1px solid var(--line); overflow-wrap: anywhere; }
    @media (max-width: 700px) { .grid { grid-template-columns: 1fr; } .card { padding: 16px; } }
    @media (max-width: 430px) { .sos-problems { grid-template-columns: repeat(2,minmax(0,1fr)); } }
  `;
  const content = document.createElement("main");
  content.innerHTML = "\n<header><strong class=\"brand\"><b>SOS</b> YOL YARDIMI</strong><small>Sınaq rejimi · real ödəniş və zəng yoxdur</small></header>\n<h1>Yolda qalmısan?</h1>\n<p class=\"muted\">Problemi seç. SosAvto operatoru zəng edib səni uyğun ustaya yönləndirsin.</p>\n<nav aria-label=\"Sınaq rolları\"></nav>\n<div class=\"grid\"><section class=\"card\" id=\"work\"></section><aside class=\"card\" id=\"summary\" aria-live=\"polite\"></aside></div>\n";
  const mapStyles = document.createElement('link');
  mapStyles.rel = 'stylesheet';
  mapStyles.href = '/assets/leaflet.css';
  root.append(mapStyles, style, content);
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
    quote: ['master', 'Sifariş təklifi', 'SosAvto tarifinə bax və sifarişə cavab ver.'],
    offer: ['operator', 'Sifarişi təsdiqlə', 'Usta sifarişi qəbul edib. Sabit qiyməti müştəriyə göndər.'],
    pay: ['driver', 'Təklifi təsdiqlə', 'Sınaq ödənişindən sonra usta ünvanı görəcək.'],
    travel: ['master', 'Usta yoldadır', 'Ünvana çatanda sifarişdə qeyd et.'],
    work: ['master', 'İşin nəticəsi', 'Əlavə iş üçün qiymət təklifi göndər və ya işin nəticəsini yaz.'],
    extraPrice: ['operator', 'Əlavə xidməti qiymətləndir', 'Əlavə məbləği SosAvto tarifi üzrə təsdiqlə.'],
    extra: ['driver', 'Əlavə işi təsdiqlə', 'Əlavə işə razısansa, sifarişdə sınaq ödənişi et.'],
    finish: ['driver', 'İşi yoxla', 'İş tamamlanıbsa, ödəniş bölgüsünü təsdiqlə.'],
    review: ['operator', 'Ləğv və ya mübahisə', 'Müştərinin və ustanın məlumatlarını yoxla. Qərar sifariş tarixçəsində qalır.'],
    closed: ['driver', 'Sifariş bağlandı', 'Ödəniş və qərarlar tarixçədə görünür.'],
  };
  const fresh = () => ({step:'start', role:'driver', paid:0, refund:0, deposit:2500, flags:{driver:0, master:0}, log:[], messages:[]});
  let order = fresh();
  const nav = root.querySelector('nav');
  const work = root.querySelector('#work');
  const summary = root.querySelector('#summary');
  const money = amount => (amount / 100).toFixed(2) + ' AZN';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]);
  const button = (action, label, primary = false) => `<button type="submit" value="${action}" class="${primary ? 'primary' : ''}">${label}</button>`;
  const field = (name, label, attrs = 'required maxlength="180"') => `<label>${label}<input name="${name}" ${attrs}></label>`;
  const fee = (name, title, initial) => field(name, title, `type="number" required min="0" max="1000" step=".01" value="${initial}"`);
  const split = () => `<p>Müştəri ödəyir ${money(order.total)} · SosAvto komissiyası ${money(order.commission)} · Ustaya ${money(order.total - order.commission)}</p>`;
  const price = () => `<p class="amount">${money(order.total)}</p><p>Ustanın təxmini çatma vaxtı · ${order.eta} dəqiqə</p>`;
  const reason = () => '<label>Səbəb<select name="reason" required><option value="">Seçin</option><option>Usta gəlmədi</option><option>Yerində həll mümkün olmadı</option><option>Saytdan kənar ödəniş istəndi</option><option>Plan dəyişdi</option></select></label>';
  const baku = [40.4093, 49.8671];
  let selectedPoint;
  let map;
  const mapPanel = '<div class="location-map" aria-label="SOS məkan xəritəsi"></div><p class="muted" data-location-status role="status"></p>';
  const navigation = () => {
    const point = order.point.join(',');
    return mapPanel + `<p><a href="https://www.google.com/maps/dir/?api=1&destination=${point}" target="_blank" rel="noopener noreferrer">Google Maps-də marşrutu aç</a> · <a href="https://waze.com/ul?ll=${point}&navigate=yes" target="_blank" rel="noopener noreferrer">Waze-də aç</a></p>`;
  };

  async function mountMap() {
    const container = root.querySelector('.location-map');
    if (!container || !mapLibrary) return;
    const status = root.querySelector('[data-location-status]');
    const locate = root.querySelector('.locate');
    let pin;
    let L;
    const show = (point, zoom = 16) => {
      if (!map) return;
      map.setView(point, zoom);
      if (pin) pin.setLatLng(point);
      else pin = L.circleMarker(point, {radius:9, color:'#087ca9', fillColor:'#20b5eb', fillOpacity:.88, weight:3}).addTo(map);
    };
    if (locate) locate.onclick = () => {
      if (!navigator.geolocation) { status.textContent = 'GPS əlçatan deyil. Xəritədə nöqtə seç.'; return; }
      locate.disabled = true;
      status.textContent = 'Məkan axtarılır…';
      navigator.geolocation.getCurrentPosition(({coords}) => {
        if (!container.isConnected) return;
        locate.disabled = false;
        selectedPoint = [coords.latitude, coords.longitude];
        show(selectedPoint);
        status.textContent = `Məkan seçildi · GPS dəqiqliyi təxminən ${Math.round(coords.accuracy)} m.`;
      }, () => {
        if (!container.isConnected) return;
        locate.disabled = false;
        status.textContent = 'Məkan alınmadı. GPS icazəsini yoxla və ya xəritədə nöqtə seç.';
      }, {enableHighAccuracy:true, timeout:10000, maximumAge:0});
    };
    try { L = await mapLibrary(); } catch {
      if (container.isConnected && !status.textContent) status.textContent = locate ? 'Xəritə yüklənmədi. GPS ilə məkan seçə bilərsən.' : 'Xəritə yüklənmədi. Marşrut linkindən istifadə et.';
      return;
    }
    if (!container.isConnected) return;
    map = L.map(container, {scrollWheelZoom:false}).setView(baku, 12);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom:19, attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
    if (locate) map.on('click', ({latlng}) => {
      selectedPoint = [latlng.lat, latlng.lng];
      show(selectedPoint, map.getZoom());
      status.textContent = 'Məkan seçildi. Sorğunu göndərməzdən əvvəl nöqtəni yoxla.';
    });
    const point = locate ? selectedPoint : order.point;
    if (point) show(point);
  }

  const paymentMethods = {apple:'Apple Pay', google:'Google Pay', card:'Visa / Mastercard', saved:'Saxlanmış kart · •••• 4242'};
  let checkout;
  let savedDemoCard = false;
  function paymentPanel(amount) {
    if (!checkout) return button('openPayment', 'Kartla ödə (sınaq)', true);
    const options = ['apple','google','card', ...(savedDemoCard ? ['saved'] : [])];
    const method = checkout.method;
    return `<section class="checkout"><h3>Ödəniş üsulunu seç · ${money(amount)}</h3>
      <p class="muted">Sınaq ödənişidir. Real kart məlumatı daxil etmə.</p>
      ${method ? `<p><strong>${paymentMethods[method]}</strong></p>
        ${method === 'card' ? '<p>Nümunə kart · •••• 4242</p><label><input name="saveCard" type="checkbox">Nümunə kartı növbəti sınaq üçün yadda saxla</label>' : ''}
        ${button('confirmPayment','Sınaq ödənişini təsdiqlə',true)}
        ${button('backPayment','Üsulu dəyiş')}` :
        `<div class="actions">${options.map(key => button('method-' + key,paymentMethods[key])).join('')}</div>
          ${savedDemoCard ? button('forgetCard','Nümunə kartı sil') : ''}`}
      ${button('closePayment','Bağla')}
    </section>`;
  }
  const screens = {
    start: () => `<fieldset class="sos-problems"><legend class="sr-only">SOS kateqoriyası</legend>${Object.entries(labels).map(([key, label]) => `<label><input type="radio" name="category" value="${key}" required${key === 'battery' ? ' checked' : ''}><span>${categoryIcon(key)}${label}</span></label>`).join('')}</fieldset><h3>Haradasan?</h3><p class="muted">«Məni tap» düyməsini bas və ya xəritədə olduğun nöqtəyə toxun.</p><button type="button" class="locate"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/></svg>Məni tap</button>${mapPanel}${field('description','Qısa məlumat','maxlength="180" placeholder="Maşın işə düşmür"')}${button('create','Operator zəngi istə',true)}`,
    call: () => `<p>Məkan · ${order.point.map(value => value.toFixed(5)).join(', ')}</p>${field('note','Zəngin nəticəsi')}${fee('total','SosAvto yekun tarifi (AZN)',30)}${fee('commission','SosAvto komissiyası (AZN)',5)}${fee('callFee','Çatma təsdiqlənərsə saxlanıla bilən gəliş haqqı (AZN)',5)}${button('dispatch','Sorğunu ustaya göndər',true)}`,
    quote: () => order.flags.master >= 2 ? '<p>Ustanın yeni sifarişləri operator yoxlamasına qədər dayandırılıb.</p>' : `<p>Usta ${order.candidate} (sınaq) · ${escape(order.note)}</p><p>Sənin qazancın</p><p class="amount">${money(order.total - order.commission)}</p><p>Xidmətin qiyməti ${money(order.total)} · SosAvto komissiyası ${money(order.commission)}</p>${field('eta','Çatma müddəti (dəqiqə)','type="number" required min="1" max="180" value="20"')}${button('quote','Qəbul et',true)} <button type="submit" value="rejectQuote" formnovalidate>İmtina et</button>`,
    offer: () => split() + `<p>Usta ${order.candidate} qəbul edib · ${order.eta} dəqiqə</p>` + button('offer','Sabit qiyməti müştəriyə göndər',true),
    pay: () => price() + `<p>Ödəniş üsulu: bank kartı. Ləğv və mübahisələr operator tərəfindən yoxlanır. Çatma təsdiqlənərsə, ${money(order.callFee)} gəliş haqqı saxlanıla bilər. Geri ödəniş ödəniş edilən karta yönləndirilir.</p>` + paymentPanel(order.total),
    travel: () => `${navigation()}${field('code','Müştərinin çatma kodu','required inputmode="numeric" pattern="[0-9]{4}" maxlength="4"')}${button('arrive','Çatma kodunu təsdiqlə',true)}`,
    work: () => `${navigation()}${field('item','Əlavə işin adı','maxlength="180"')}<div class="actions">${button('extra','Əlavə işi operatora göndər')}${button('finish','İş görüldü',true)}${button('unresolved','Yerində həll olunmadı')}</div>`,
    extraPrice: () => `<p>${escape(order.item)}</p>${fee('extraFee','Əlavə xidmətin SosAvto tarifi (AZN)',10)}${fee('extraCommission','Əlavə xidmətin SosAvto komissiyası (AZN)',0)}${button('extraPrice','Qiyməti müştəriyə göndər',true)}`,
    extra: () => `<p>${escape(order.item)} · ${money(order.extraFee)}</p>${paymentPanel(order.extraFee)}<div class="actions">${button('decline','Təklifi rədd et')}</div>`,
    finish: () => `<div class="actions">${button('complete','İş tamamlandı',true)}${button('dispute','Problem bildir')}</div>`,
    review: () => `<p>${escape(order.reason)}</p><div class="actions">${button('refundAll','Tam geri ödəniş')}${order.arrived ? button('refundWork','İş haqqını qaytar') : ''}${button('fraud','Təsdiqlənmiş aldatma')}${order.cancelRole ? button('unjustified','Əsassız imtinanı qeyd et') : ''}</div>`,
    closed: () => button('reset','Yeni sınaq başlat',true),
  };

  function go(step, message) {
    checkout = null;
    order.step = step;
    order.role = flow[step][0];
    order.log.push(message);
    render();
  }

  function render() {
    map?.remove();
    map = null;
    const [role, title, help] = flow[order.step];
    nav.innerHTML = Object.entries(roles).map(([key, label]) => `<button type="button" data-role="${key}" aria-pressed="${order.role === key}">${label}</button>`).join('');
    const canCancel = ['pay','travel','work','extraPrice','extra','finish'].includes(order.step) && order.role !== 'operator';
    work.innerHTML = `<h2>${title}</h2><p class="muted">${help}</p>${order.role === role ? `<form id="stage">${screens[order.step]()}</form>` : `<p>Növbəti addımı <strong>${roles[role]}</strong> yerinə yetirir.</p>`}${order.step === 'travel' && order.role === 'driver' ? `<p>Ustaya yalnız ünvana çatanda de: <strong>${order.arrivalCode}</strong></p>` : ''}${canCancel ? `<details><summary>Sifarişi ləğv et</summary><form id="cancel">${reason()}${button('cancel','Səbəbi göndər')}</form></details>` : ''}<p id="error" role="alert"></p>`;
    if (order.step !== 'start' && (order.role !== 'master' || order.paid)) {
      work.insertAdjacentHTML('beforeend', `<section class="messages"><h3>Sifariş mesajları</h3><p class="muted">Bu yazışmanı sifarişin müştərisi, ustası və SosAvto operatoru görə bilər.</p><ol>${order.messages.map(message => `<li><strong>${roles[message.role]}</strong> · ${escape(message.text)}</li>`).join('')}</ol>${order.step === 'closed' ? '' : `<form>${field('message','Mesaj','required maxlength="500"')}${button('message','Mesajı göndər')}</form>${order.role === 'operator' && order.step !== 'review' ? '<form><button type="submit" value="hold">Sifarişi yoxlamaya al</button></form>' : ''}`}</section>`);
    }
    void mountMap();
    summary.innerHTML = `<h2>Sifariş tarixçəsi</h2>${order.category ? `<p>${labels[order.category]}</p>` : ''}<dl><dt>Kartla ödəniş (sınaq)</dt><dd>${money(order.paid)}</dd><dt>Karta geri ödəniş (sınaq)</dt><dd>${money(order.refund)}</dd>${order.role !== 'driver' ? `<dt>SosAvto payı</dt><dd>${money(order.share || 0)}</dd><dt>Usta qazancı</dt><dd>${money(order.earnings || 0)}</dd>` : ''}${order.role !== 'driver' ? `<dt>Usta depoziti</dt><dd>${money(order.deposit)}</dd>` : ''}</dl>${order.flags.driver || order.flags.master ? `<p>Əsassız imtina · Müştəri ${order.flags.driver} · Usta ${order.flags.master}</p>` : ''}<ol>${order.log.map(item => `<li>${escape(item)}</li>`).join('')}</ol>`;
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
        if (!selectedPoint) { root.querySelector('#error').textContent = 'Əvvəl xəritədə məkan seç və ya «Məni tap» düyməsini bas.'; return; }
        Object.assign(order, {category:form.get('category'), point:selectedPoint});
        return go('call', 'SOS sorğusu açıldı. ' + form.get('description'));
      case 'message': {
        const text = form.get('message').trim();
        if (!text) return;
        order.messages.push({role:order.role, text});
        return render();
      }
      case 'hold':
        order.reason = 'Operator sifarişi yoxlamaya aldı.';
        return go('review', order.reason);
      case 'dispatch': {
        const total = amount('total');
        const commission = amount('commission');
        const callFee = amount('callFee');
        if (total <= 0 || commission > total || callFee > total) {
          root.querySelector('#error').textContent = 'Yekun qiymət sıfırdan böyük olmalı, komissiya və gəliş haqqı yekun qiyməti aşmamalıdır.';
          return;
        }
        Object.assign(order, {note:form.get('note'), total, commission, callFee, candidate:1});
        return go('quote', 'Sorğu SosAvto tarifi ilə ustaya göndərildi.');
      }
      case 'rejectQuote':
        order.candidate += 1;
        return go('quote', 'Usta imtina etdi. Sifariş eyni tariflə növbəti sınaq ustasına göndərildi.');
      case 'quote':
        order.eta = Number(form.get('eta'));
        return go('offer', 'Usta sifarişi qəbul etdi.');
      case 'offer':
        return go('pay', 'SosAvto tarifi müştəriyə göndərildi: ' + money(order.total) + '.');
      case 'openPayment': checkout = {}; return render();
      case 'closePayment': checkout = null; return render();
      case 'backPayment': checkout.method = null; return render();
      case 'forgetCard': savedDemoCard = false; return render();
      case 'method-apple':
      case 'method-google':
      case 'method-card':
      case 'method-saved':
        checkout.method = action.slice('method-'.length);
        return render();
      case 'confirmPayment': {
        if (order.role !== 'driver' || !checkout?.method || !['pay','extra'].includes(order.step)) return;
        const method = paymentMethods[checkout.method];
        if (checkout.method === 'card' && form.has('saveCard')) savedDemoCard = true;
        if (order.step === 'extra') {
          order.paid += order.extraFee;
          order.paidExtraCommission = (order.paidExtraCommission || 0) + order.extraCommission;
          return go('work', method + ' ilə əlavə işin sınaq ödənişi təsdiqləndi.');
        }
        order.arrivalCode = String(1000 + crypto.getRandomValues(new Uint32Array(1))[0] % 9000);
        order.paid = order.total;
        return go('travel', method + ' ilə sınaq ödənişi təsdiqləndi. Ustaya ünvan açıldı.');
      }
      case 'arrive':
        if (form.get('code') !== order.arrivalCode) { root.querySelector('#error').textContent = 'Çatma kodu düzgün deyil.'; return; }
        order.arrivalCode = null;
        order.arrived = true; return go('work', 'Çatma birdəfəlik kodla təsdiqləndi.');
      case 'extra': {
        const item = form.get('item').trim();
        if (!item) { root.querySelector('#error').textContent = 'Əlavə işin adını yaz.'; return; }
        order.item = item;
        return go('extraPrice', 'Usta əlavə xidmət üçün operatora müraciət etdi.');
      }
      case 'extraPrice':
        order.extraFee = amount('extraFee');
        order.extraCommission = amount('extraCommission');
        if (order.extraFee <= 0 || order.extraCommission > order.extraFee) {
          root.querySelector('#error').textContent = 'Əlavə xidmətin qiyməti sıfırdan böyük olmalı və komissiyanı qarşılamalıdır.';
          return;
        }
        return go('extra', 'Əlavə xidmətin tarifi müştəriyə göndərildi: ' + money(order.extraFee) + '.');
      case 'decline': return go('work', 'Müştəri əlavə təklifi rədd etdi.');
      case 'finish': return go('finish', 'Usta işi tamamladığını bildirdi.');
      case 'complete':
        order.share = order.commission + (order.paidExtraCommission || 0);
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
        selectedPoint = null;
        order = {...fresh(), deposit:order.deposit, flags:order.flags};
        return render();
    }
  };

  render();
}
