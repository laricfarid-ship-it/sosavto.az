// Static informational pages: about, contact, terms and privacy.
// Every statement here describes what the code does today; update this file when behaviour changes.
// The contact details are shown on the contact and privacy pages. Fill them in once, here.
export const contact={email:'sosavtoaz@gmail.com',phone:'010 215 90 55'};
export const updated='16 oktyabr 2026';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function contactHtml(c=contact){
 const email=String(c.email||'').trim(),phone=String(c.phone||'').trim();
 const rows=[];
 if(/^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(email))rows.push(`E-poçt: <a class="accent" href="mailto:${esc(email)}">${esc(email)}</a>`);
 const tel=phone.replace(/[^+\d]/g,'');
 if(tel.length>=9)rows.push(`Telefon: <a class="accent" href="tel:${esc(tel)}">${esc(phone)}</a>`);
 return rows.length?rows.map(r=>`<p>${r}</p>`).join(''):'<p>Əlaqə məlumatı tezliklə əlavə olunacaq.</p>';
}

const list=items=>`<ul>${items.map(i=>`<li>${i}</li>`).join('')}</ul>`;
const para=items=>items.map(p=>`<p>${p}</p>`).join('');

export const legalPages={
 'haqqinda.html':{
  title:'Haqqımızda',
  description:'SosAvto.az Azərbaycanda avtomobil, ehtiyat hissələri, servis, avtoyuma və yol yardımı xidmətləri üçün elan platformasıdır.',
  body:()=>`
   <h2>SosAvto.az nədir?</h2>
   ${para(['SosAvto.az Azərbaycanda avtomobillə bağlı hər şeyi bir yerdə toplamaq məqsədi ilə yaradılmış elan platformasıdır. Burada avtomobil, ehtiyat hissələri, usta və servis, sığorta, avtoyuma, detailinq və qeydiyyat nişanı elanlarını yerləşdirmək və axtarmaq olar.','Sayt inkişaf mərhələsindədir və yeni imkanlar addım-addım əlavə olunur.'])}
   <h2>Nələr var?</h2>
   ${list(['Marka, model, il, qiymət və digər filtrlərlə axtarış, 2-3 avtomobilin müqayisəsi.','Kredit kalkulyatoru (məlumat xarakterlidir, bank təklifi deyil).','Servis və mağazaların xəritəsi.','SOS yol yardımı: yaxınlıqdakı ustanı çağırmaq.','Avtoyuma üçün yer rezervasiyası.','Daxil olmuş istifadəçilər üçün AI köməkçi.'])}
   <h2>Necə işləyir?</h2>
   ${para(['Elanları istifadəçilər yerləşdirir. Hər yeni və ya dəyişdirilmiş elan dərc olunmazdan əvvəl moderator yoxlamasından keçir. Elanlardakı alqı-satqı sayt üzərindən aparılmır, alıcı ilə satıcı birbaşa əlaqə saxlayır.','Sual, təklif və ya şikayətiniz varsa, <a class="accent" href="elaqe.html">Əlaqə</a> səhifəsinə baxın.'])}`
 },
 'elaqe.html':{
  title:'Əlaqə',
  description:'SosAvto.az ilə əlaqə: sual, təklif, şikayət və reklam üçün.',
  body:()=>`
   <h2>Bizimlə əlaqə</h2>
   ${contactHtml()}
   <h2>Hansı məsələ üçün yazmaq olar?</h2>
   ${list(['Sayt, hesab və ya elanla bağlı sual.','Elanın silinməsi, məlumatın düzəldilməsi və ya şəxsi məlumat tələbi.','Texniki xəta bildirişi.','Reklam və əməkdaşlıq təklifi.'])}
   <h2>Elanla bağlı şikayət</h2>
   ${para(['Şübhəli, saxta və ya qaydalara zidd elanı ilə rastlaşdınızsa, elan səhifəsindəki şikayət düyməsindən istifadə edin. Moderatorlar şikayətlərə baxır.','Həyat üçün təhlükə olan təcili hallarda saytı gözləməyin, <strong>112</strong> nömrəsinə zəng edin.'])}`
 },
 'qaydalar.html':{
  title:'İstifadə şərtləri',
  description:'SosAvto.az saytından istifadə qaydaları: elan yerləşdirmə, məsuliyyət, qadağan olunmuş məzmun.',
  body:()=>`
   <p class="muted">Son yenilənmə: ${updated}</p>
   <p>Saytdan istifadə etməklə bu şərtlərlə razılaşırsınız. Razı deyilsinizsə, saytdan istifadə etməyin.</p>
   <h2>1. Platformanın rolu</h2>
   ${para(['SosAvto.az elan yerləşdirmək və axtarmaq üçün vasitədir. Alqı-satqı, xidmət və ya ödəniş sayt üzərindən həyata keçirilmir, alıcı və satıcı (və ya xidmət göstərən) arasında birbaşa olur. Platforma elan verənin tərəfi deyil və sövdələşmənin nəticəsinə görə cavabdeh deyil.','Alış və ödənişdən əvvəl avtomobili, sənədləri və satıcını özünüz yoxlayın. Əvvəlcədən pul köçürməkdən çəkinin.'])}
   <h2>2. Hesab</h2>
   ${list(['Qeydiyyatda düzgün məlumat verməlisiniz.','Şifrənizin təhlükəsizliyinə siz cavabdehsiniz. Hesabınızdan edilən əməliyyatlar sizə aid sayılır.','Qaydaları pozan hesablar xəbərdarlıqsız bloklana bilər.'])}
   <h2>3. Elan qaydaları</h2>
   ${para(['Elan verən yalnız özünə məxsus və ya satmağa hüququ olduğu əşya və xidməti yerləşdirməlidir. Aşağıdakılar qadağandır:'])}
   ${list(['Yalan, aldadıcı və ya saxta məlumat, başqasının şəkli və sənədləri.','Qanunla qadağan olunmuş əşya və xidmətlər.','Başqasının şəxsi məlumatlarının icazəsiz yerləşdirilməsi.','Təhqiramiz, qeyri-etik və ya zorakılığa çağıran məzmun.','Eyni elanın dəfələrlə təkrar yerləşdirilməsi və ya spam.'])}
   ${para(['Moderatorlar elanı yoxlayır, rədd edə, dəyişdirilməsini istəyə və ya silə bilər. Elanın dərc olunması keyfiyyətə və düzgünlüyə təminat deyil.','Yerləşdirdiyiniz mətn və şəkillərin sizə aid olduğunu təsdiq edirsiniz. Onların saytda göstərilməsinə icazə verirsiniz.'])}
   <h2>4. Qeydiyyat nişanları</h2>
   ${para(['Nişan elanları yalnız elan xidmətidir. Sayt nişanın hüquqi mənsubiyyətini yoxlamır və nişanın başqasına keçirilməsini həyata keçirmir. Ödənişdən əvvəl keçirmə qaydalarını Dövlət Yol Polisi ilə dəqiqləşdirin.'])}
   <h2>5. Avtoyuma rezervi</h2>
   ${para(['Rezerv saytda yer saxlayır. Ödəniş hazırda avtoyumada yerindədir (nağd), kartla ödəniş aktiv deyil. Xidmətin keyfiyyətinə və qiymətinə avtoyuma sahibi cavabdehdir.'])}
   <h2>6. SOS yol yardımı</h2>
   ${para(['SOS bölməsi sürücünü yaxınlıqdakı usta ilə əlaqələndirir. Ustanın xidmətinə, qiymətinə və gəliş vaxtına usta cavabdehdir, platforma bunlara zəmanət vermir. Qiyməti qəbul etməzdən əvvəl təsdiqləyin.','Həyat və sağlamlıq üçün təhlükə, qəza və xəsarət hallarında əvvəlcə <strong>112</strong> nömrəsinə zəng edin.'])}
   <h2>7. AI köməkçi və kalkulyator</h2>
   ${para(['AI köməkçinin cavabları və kredit kalkulyatorunun nəticələri məlumat xarakterlidir və səhv ola bilər. Onlar peşəkar məsləhət, qiymət qiymətləndirməsi və ya bank təklifi deyil. Mühüm qərarlardan əvvəl yoxlayın.'])}
   <h2>8. Məsuliyyətin məhdudlaşdırılması</h2>
   ${para(['Sayt "olduğu kimi" təqdim olunur. Fasiləsiz və xətasız işləməsinə, elanların düzgünlüyünə təminat vermirik. Qanunun icazə verdiyi həddə, saytdan istifadə nəticəsində yaranan dolayı zərərlərə görə məsuliyyət daşımırıq.'])}
   <h2>9. Dəyişikliklər və tətbiq olunan hüquq</h2>
   ${para(['Şərtləri vaxtaşırı yeniləyə bilərik. Yeni versiya bu səhifədə dərc olunduğu andan qüvvəyə minir. Şərtlərə Azərbaycan Respublikasının qanunvericiliyi tətbiq olunur.','Suallar üçün: <a class="accent" href="elaqe.html">Əlaqə</a>.'])}`
 },
 'mexfiyyet.html':{
  title:'Məxfilik siyasəti',
  description:'SosAvto.az hansı məlumatı toplayır, nə üçün istifadə edir, kimlərlə bölüşür və hüquqlarınız.',
  body:()=>`
   <p class="muted">Son yenilənmə: ${updated}</p>
   <p>Bu səhifə SosAvto.az saytının hansı məlumatı topladığını və necə istifadə etdiyini izah edir.</p>
   <h2>1. Topladığımız məlumat</h2>
   ${list([
    '<strong>Hesab:</strong> ad və soyad, istifadəçi adı, e-poçt, istəyə görə telefon. Şifrəniz açıq saxlanmır, yalnız bir tərəfli şifrələnmiş (bcrypt) forması saxlanır.',
    '<strong>Elanlar:</strong> başlıq, təsvir, qiymət, şəhər, telefon, ünvan, xəritədə seçilmiş yer və şəkillər. Şəkillərdən kamera və yer məlumatı (EXIF) silinir. Elanda göstərdiyiniz əlaqə məlumatı (telefon, ünvan) elana baxanlara görünür.',
    '<strong>Fəaliyyət:</strong> seçilmişlər, bildirişlər, göndərdiyiniz şikayətlər, elanın baxış və seçilmə sayı. Baxış sayı səhifənin açılma sayıdır, ziyarətçini izləmir.',
    '<strong>SOS yol yardımı:</strong> sorğuda göstərdiyiniz yer (GPS və ya əl ilə seçilmiş), ünvan, telefon və qeyd. Usta kimi qeydiyyatdan keçmisinizsə, aktiv olduğunuz müddətdə mövqeyiniz yenilənir. Dəqiq ünvan və telefon təyin olunmuş ustaya yalnız qiyməti təsdiq etdikdən sonra göstərilir.',
    '<strong>Avtoyuma:</strong> yaxınlıq üçün mövqeyiniz yalnız cihazınızda hesablanır, koordinatlarınız serverə göndərilmir.',
    '<strong>Texniki məlumat:</strong> təhlükəsizlik və sui-istifadənin qarşısını almaq üçün sorğu sayını limitləyən qısa müddətli sayğaclar (şəbəkə ünvanı ilə bağlıdır).'
   ])}
   <h2>2. Çərəzlər və brauzer yaddaşı</h2>
   ${para(['Yalnız zəruri bir giriş çərəzi (<code>sosavto_session</code>) istifadə edirik. Giriş etdiyinizi xatırlamaq üçündür, JavaScript-dən oxunmur. Müqayisə siyahısı brauzerin müvəqqəti yaddaşında (sessionStorage) saxlanır və tabı bağlayanda silinir.','Hazırkı versiyada üçüncü tərəfin analitika və reklam izləyicilərindən istifadə etmirik.'])}
   <h2>3. Məlumatdan nə üçün istifadə edirik</h2>
   ${list(['Hesabınızı yaratmaq və elanlarınızı göstərmək.','Elanları moderasiya etmək və saxtakarlığın qarşısını almaq.','Bildiriş, şifrə bərpası və SOS kimi xidmətləri göstərmək.','Saytı təhlükəsiz saxlamaq.'])}
   <h2>4. Üçüncü tərəflər</h2>
   ${para(['Xidmətin işləməsi üçün aşağıdakı provayderlərdən istifadə edirik:'])}
   ${list([
    '<strong>Vercel:</strong> saytın yerləşdirilməsi.',
    '<strong>PostgreSQL verilənlər bazası və şəkil saxlama xidmətləri:</strong> hesab, elan və şəkillərin saxlanması.',
    '<strong>Resend:</strong> şifrə bərpası e-poçtunun göndərilməsi (e-poçt ünvanınız ona ötürülür).',
    '<strong>Google Gemini:</strong> AI köməkçi. Yalnız daxil olmuş istifadəçi razılıq verdikdən sonra yazdığınız mətn Google-a göndərilir. Pulsuz xidmətdə Google məzmunu məhsullarını təkmilləşdirmək üçün istifadə edə bilər, ona görə şəxsi və məxfi məlumat yazmayın.',
    '<strong>OpenStreetMap:</strong> xəritə şəkilləri. Xəritə açılanda brauzeriniz birbaşa OpenStreetMap serverlərinə sorğu göndərir və şəbəkə ünvanınız ona görünür.'
   ])}
   ${para(['Google Xəritə, Waze və WhatsApp keçidlərinə basanda həmin xidmətlərin öz qaydaları tətbiq olunur. Saytda göstərilən reklam keçidləri (məsələn, Technol) sizi tərəfdaşın saytına aparır. Reklam izləyicisi yoxdur.','Məlumatınızı satmırıq.'])}
   <h2>5. Saxlama və təhlükəsizlik</h2>
   ${para(['Məlumat hesabınız aktiv olduğu müddətdə saxlanır. Sessiyalar, şifrə bərpası kodları və limit sayğacları qısa müddətlidir və vaxtı bitəndə etibarsız olur. Şəbəkə ötürülməsi şifrələnir (https), girişlərə sorğu limitləri tətbiq olunur.','Heç bir sistem tam təhlükəsiz deyil. Şifrənizi qoruyun və başqası ilə bölüşməyin.'])}
   <h2>6. Hüquqlarınız</h2>
   ${para(['Profilinizdəki məlumatı özünüz dəyişə, elanlarınızı redaktə və ya silə bilərsiniz. Məlumatınızın düzəldilməsini, silinməsini və ya haqqında məlumat almağı tələb etmək üçün bizə yazın. Qüvvədə olan qanunvericilik çərçivəsində cavab veririk.'])}
   ${contactHtml()}
   <h2>7. Uşaqlar</h2>
   ${para(['Sayt 18 yaşdan kiçik şəxslər üçün nəzərdə tutulmayıb.'])}
   <h2>8. Dəyişikliklər</h2>
   ${para(['Siyasəti yenilədikdə bu səhifədə tarixi dəyişəcəyik. Əhəmiyyətli dəyişikliklərdə saytda xəbərdarlıq edə bilərik.'])}`
 }
};

export function legalPage(page){
 if(!Object.hasOwn(legalPages,page))return null;
 const p=legalPages[page];
 return {title:p.title,description:p.description,html:`<article class="legal"><h1>${esc(p.title)}</h1>${p.body()}</article>`};
}
export const legalLinks=[['haqqinda.html','Haqqımızda'],['elaqe.html','Əlaqə'],['qaydalar.html','İstifadə şərtləri'],['mexfiyyet.html','Məxfilik']];
