# SosAvto — axtarış və müqayisə üzrə davam qeydi

Tarix: 2026-10-09. Budaq: `feat/discovery-comparison`.
Başlanğıc commit: `06d14ed` (main).

## Razılaşdırılmış iş

Birinci paket: kateqoriyaya uyğun ilk ekran/axtarış, kuzov ikonları,
silinə bilən aktiv filtr çipləri, elan texniki göstəriciləri və qalereyanın
yaxşılaşdırılması, 2–3 avtomobilin müqayisəsi.
İstifadəçi limit bitsə də işin və növbəti addımların saxlanmasını istəyir.

## Sərhədlər

- Ödənişli xidmət qoşma. Yeni AI və ya digər provayder lazım deyil.
- AI/şifrə bərpasının açıq draft PR-lərini bu işə birləşdirmə.
- SOS-u bu iş çərçivəsində yayımlama və ayarlarını dəyişmə.
- Servis xəritəsinin mövcud elan inteqrasiyasını qoru.
- Saxta ekspertiza nişanı, qiymət qiymətləndirməsi və etibar rəqəmləri əlavə etmə.
- Əvvəl ayrıca budaq və sınaq; əsas sayta yayım statusunu açıq bildir.

## Yoxlanmış başlanğıc vəziyyət

- Repo GitHub-dan alındı; iş ağacı təmiz idi.
- Servis xəritəsi artıq təsdiqlənmiş elanları göstərir.
- Elan qalereyası və göstəricilər var, görünüş və idarəetmə təkmilləşdiriləcək.
- Cari kodun birbaşa ana səhifə seçimi `all`-dır; əvvəlki istifadəçi qərarına
  uyğun `car` ediləcək, `category=all` ayrıca işləyəcək.

## Hazır olanlar

- Ana səhifə avtomatik avtomobil kateqoriyasında açılır. Bütün elanlar ayrıca
  `category=all` seçimi ilə işləyir; serverə bu süni kateqoriya göndərilmir.
- Böyük banner əvəzinə birinci ekranda kateqoriyalar və axtarış.
- 7 kuzov ikonu, marka/model/il/qiymət, kateqoriyaya uyğun əlavə filtrlər.
- Aktiv filtr çipləri; marka silindikdə bağlı model də silinir, səhifələmə sıfırlanır.
- URL-dən aktiv əlavə filtrlər açıq bərpa olunur, əvvəl görünməyən rəng/ötürücü də göstərilir.
- Həqiqi avtomobil kartlarında və aktiv elan daxilində müqayisə düyməsi.
- 2–3 avtomobil müqayisəsi, tab sessiyasında seçim, paylaşıla bilən `muqayise.html?ids=...` linki.
- Maksimum 3 seçim, seçimdən çıxarma, təmizləmə, yalnız fərqləri göstərmə.
- Məlumatlar açılışda mövcud API-dən alınır; əlçatmaz/satılmış elanlar qiymətlə göstərilmir.
- Texniki göstəricilərin qısa paneli; olmayan məlumat uydurulmur.
- Qalereya: əvvəlki/növbəti, klaviatura oxları, toxunaraq sürüşdürmə,
  sayğac və seçilmiş kiçik şəkil vəziyyəti.
- Nümunə kartları saxlanılıb, real nəticələr varsa onlardan sonra göstərilir.
- Yeni provayder, ödəniş, baza sxemi və production ayarı yoxdur.

## Yoxlama nəticələri

- `npm test`: 96/96 keçdi.
- `npm run build`: keçdi.
- `git diff --check`: keçdi.
- `tests/discovery-browser.mjs`: Chromium 153, 390px və 1280px.
  Real tətbiq API-si və ayrıca yaddaşdaxili PGlite bazası istifadə edildi.
  Kuzov/qiymət filtrinin real nəticəsi, çip silinməsi, bütün kateqoriyalar,
  3 seçim həddi, reload-dan sonra seçim, yalnız fərqlər və qalereya yoxlanıldı.
  JavaScript xətası və üfüqi səhifə daşması yoxdur.
- Görünüşün ekran şəkillərinə baxıldı. Test şəkilləri və elanlar süni fixture-dir,
  production-a daxil edilməyib. Fiziki telefonda və yerləşdirilmiş preview-də
  sınaq hələ aparılmayıb.
- Brauzer yoxlamasını təkrar icra etmək üçün Playwright və Chromium tələb olunur:
  `PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs BROWSER_EXECUTABLE=/path/to/chromium node tests/discovery-browser.mjs`

## Əvvəlki göndəriş bloku — arxiv (həll edilib)

GitHub-a push avtomatik təsdiq yoxlaması tərəfindən iki dəfə rədd edildi.
Birinci səbəb xarici ünvanın doğrulanmaması idi. Sonra GitHub connector ilə
repo sahibinin bağlı istifadəçi `laricfarid-ship-it` olduğu, admin/push
hüquqları və reponun PUBLIC olduğu təsdiqləndi. İkinci yoxlama public repoya
bu yeni dəyişikliklərin açıq göndəriş icazəsinin olmamasını səbəb göstərdi.
Daha bir üsulla blokdan yan keçilmədi. Remote branch/PR/deployment yaradıldığı
iddia edilməməlidir. İstifadəçidən hazır dəyişikliklərin həmin repoya ayrı
budaqda göndərilməsinə açıq icazə istənilir.

İcazədən sonra:
1. Cari remote main ilə fərqi yoxla; bu iş `06d14ed` üzərində hazırlanıb.
2. Saxlanmış patch-i təmiz iş ağacında bərpa et (paketdəki README-yə bax).
3. `feat/discovery-comparison` budağını push et və PR aç.
4. Vercel preview statusunu yoxla; yalnız hazır preview URL-ni istifadəçiyə ver.
5. Preview smoke yoxlaması olmadan production-ready demə. Bu mərhələdə
   production merge və SOS yayımlanması edilməyib.

Yeni söhbətdə əvvəl bu qeydi, paket README-sini və `git status`/son commitləri
oxu. Tamamlanmış işi yenidən başlama. Açıq AI/şifrə draft PR-ləri bu işdən ayrıdır.

## 2026-10-10 — icazə verildi

İstifadəçi hazır dəyişikliklərin `laricfarid-ship-it/sosavto.az` reposuna ayrıca
sınaq budağında göndərilməsinə açıq icazə verdi. Əvvəlki icazə bloku aradan
qalxıb. Terminal git push giriş məlumatı olmadığı üçün işləmədi; qoşulmuş
GitHub API vasitəsilə göndəriş davam edir. Production merge icazəsi deyil.

## Cari status — 2026-10-10, Bakı vaxtı

- İcazədən sonra dəyişikliklər GitHub-a uğurla göndərilib.
- Budaq: `feat/discovery-comparison`; tətbiq commit: `09b52a2f295e04f3e8806da8198b254f14b2ee07`.
- PR #11 (draft): https://github.com/laricfarid-ship-it/sosavto.az/pull/11
- Preview READY: https://sosavto-r5htneagj-laricfarid-ship-it.vercel.app
- Vercel deployment: `dpl_8W1c3KNfiviaAGQGTpUS1kpjyNbx`.
- Yoxlanmış yerli və GitHub tree SHA eynidir: `23022ab13825e89ec441636581d1fc2c4e339989`.
- Qorunmuş preview-də autentifikasiyalı HTTP yoxlaması: `/`, `/muqayise.html`, `/api/listings?category=car` — hamısı 200.
- Elan API-si 0 aktiv avtomobil qaytardı. Preview-də real elanlarla müqayisə hələ sınanmayıb; lokal brauzer testləri ayrıca test bazası ilə keçib.
- Preview Vercel giriş qorumasındadır. Müvəqqəti baxış linkinin müddəti bitərsə təzəsini yarat; giriş qorumasını söndürmə.
- Əsas sayta merge/promotion edilməyib. Növbəti addım istifadəçinin görünüşə baxması və yerləşdirilmiş versiyada real elanlarla qəbul yoxlamasıdır.
- Köhnə ZIP paketi ilkin bərpa ehtiyatıdır. Cari mənbə GitHub-dakı bu budaq və PR #11-dir; ZIP-i təkrar tətbiq etmə.

## 2026-10-10 — kredit kalkulyatoru

- İstifadəçinin “Et onuda” tapşırığı ilə ikinci mərhələnin kredit kalkulyatoru əlavə edildi.
- Avtomobil elanında qiymət avtomatik daxil edilir; ayrıca `kredit.html` səhifəsi və footer keçidi var.
- İlkin ödəniş, 1–120 ay müddət, istifadəçinin daxil etdiyi 0–100% illik faiz.
- Bərabər aylıq ödəniş, kredit məbləği, ümumi faiz, kredit üzrə cəm və ilkin ödəniş daxil cəm.
- Boş/səhv dəyərlərdə əvvəlki nəticə gizlənir; 0% və tam ilkin ödəniş dəstəklənir.
- Komissiya və sığorta daxil deyil; bank təklifi və kreditə uyğunluq təsdiqi sayılmır.
- Tam test dəsti: 100/100; kalkulyator və frontend hədəf testləri: 25/25 keçdi.
- Yeni provayder, ödəniş, verilənlər bazası və production dəyişikliyi yoxdur.
- Yayım hədəfi eyni `feat/discovery-comparison` sınaq budağı / PR #11-dir.

## 2026-10-10 — BMW giriş görünüşü

- İstifadəçinin istəyi ilə avtomobil/bütün elanlar girişində mövcud BMW fotosu geri qaytarıldı.
- Orta ölçülü ikisütunlu banner, mobil ekranda yığcam foto fonu və oxunaqlı mətn.
- Axtarış və kateqoriyalar qorundu; kuzov ikonları 44px hündürlüklü yığcam seçimlərdir.
- Digər kateqoriyaların başlıqları qorundu. Yeni provayder, ödəniş və production dəyişikliyi yoxdur.
- Build və 22 frontend testi keçdi. Sınaq budağı: feat/discovery-comparison.

## 2026-10-10 — menyu və SOS qısa keçidi

- İstifadəçinin tapşırığı: yuxarıdakı təkrar Avtoyuma keçidi çıxarıldı; ana səhifədəki kateqoriya saxlandı.
- SOS yuxarı menyudan sağ altdakı 56px (mobil 52px) dairəvi düyməyə keçirildi.
- Düymə SOS aktiv olanda bütün səhifələrdə görünür; müqayisə paneli açıq olanda yuxarı çəkilir.
- Yalnız sos.html səhifəsini açır, avtomatik sifariş göndərmir. SOS xidmət ayarları və backend dəyişməyib.
- Eyni sınaq budağında saxlanır; production merge edilməyib.
