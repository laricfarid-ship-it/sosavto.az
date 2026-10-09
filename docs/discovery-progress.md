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

## Göndəriş bloku — növbəti addım

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
