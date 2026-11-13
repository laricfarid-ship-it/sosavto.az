# SosAvto Rent a Car — təhlükəsiz inteqrasiya planı

Status: ilkin UI prototipi, canlı sistemə qoşulmayıb.

## Qərar
Həm yoxlanmış icarə şirkətləri, həm də fərdi avtomobil sahibləri avtomobil yerləşdirə bilər. Fərdi sahiblərin icarəyə vermək səlahiyyəti təsdiqlənməlidir.

## Sığorta bölməsinin əvəz edilməsi
- Köhnə sığorta elanları və məlumatları silinməsin; əvvəlcə arxiv və uyğunluq auditi aparılsın.
- `assets/app.js` içindəki `insurance` kateqoriyası, elan forması və menyu keçidləri, `assets/catalog.js`, server/API validasiyası, verilənlər bazası məhdudiyyətləri və testlər birlikdə yoxlanmalıdır.
- Backend dəstəyi olmadan mövcud `insurance` kateqoriyasını sadəcə `rentacar` adlandırmaq olmaz.
- Köhnə linklər üçün təhlükəsiz yönləndirmə strategiyası hazırlanmalıdır.

## İcarə elanı sahələri
Sahib tipi (şirkət/fərdi), avtomobilin marka/model/il, şəkillər, günlük/həftəlik/aylıq qiymət, depozit, yürüş limiti, minimum yaş və sürücülük təcrübəsi, təhvil/qaytarma ünvanı, sığorta şərtləri, sürücü seçimi, boş tarixlər, ləğv qaydaları.

## Rezervasiya
Serverdə tarix aralığı yoxlanması, ikiqat rezervasiyanın qarşısı, sifariş statusları (sorğu/gözləyir/təsdiq/rədd/ləğv/tamamlandı), admin moderasiyası, bildirişlər. Ödəniş provayderi razılıq olmadan qoşulmasın.

## Təhlükəsizlik
Şəxsiyyət və sürücülük sənədləri ictimai göstərilməsin. Minimum məlumat toplansın, səlahiyyət yoxlaması, audit qeydləri və sui-istifadə məhdudiyyətləri tətbiq olunsun.

## Buraxılış
Test branch -> avtomatik testlər -> preview deploy -> mobil/desktop QA -> istifadəçi təsdiqi -> ayrıca canlı buraxılış. Canlı sayt və main budağı bu mərhələdə dəyişdirilməsin.

## 2026-11-14 — test budağında icra olunan mərhələ

- `e0b5b26` yoxlamasında 15 frontend testi eyni `$('[data-category]').forEach` xətası ilə dayanırdı. `$$` seçicisi ilə düzəldildi; Sığorta kateqoriyasının köhnə filtri və məlumat modeli qorunur.
- Rent a Car səhifəsi ayrıca CSS/JS istifadə edir. CSP inline skriptləri blokladığı üçün ilkin formanın inline skripti çıxarıldı.
- Real stock fotolar, tünd/silver dizayn, mobil düzülüş, animasiya və reduced-motion dəstəyi; nümunə kolleksiya, şəhər/sinif filtri, günlük/həftəlik/aylıq qiymətlər, elan detalı, tarix üzrə qiymət hesablaması.
- `rental_*` adlarında ayrıca cədvəllər, sahibi və adminə görə icazələr, şirkət/fərdi profil yoxlaması, elan moderasiyası, rezervasiya sorğusu/təsdiq/rədd/ləğv/tamamlanma və audit API-si.
- Hər elan üçün identity nömrəsi və paylaşım URL-si. Profil/elan qiymət və şərtləri rezervasiyada snapshot kimi saxlanılır.
- Eyni avtomobil üzrə create/confirm/cancel/complete əməliyyatları eyni parent sətrini `FOR UPDATE` ilə kilidləyir. Təsdiqdə toqquşma transaction daxilində yenidən yoxlanır. Götürmə günü daxil, qaytarma günü xaric intervaldır.
- İcarə paneli və premium admin panelinin Rent a Car bölməsi həmin API-yə qoşulub; hazırkı Vercel preview-də məlumat yazılması aktiv deyil.

### Təhlükəsiz aktivləşdirmə

Bu mərhələdə Vercel preview dizayn/sınaq kataloqudur. Real elan, sahib yoxlaması və rezervasiya axını ayrıca yerli yaddaş bazasında avtomatik testlərlə yoxlanıb. Uzaq preview bazasında tam giriş → elan → admin təsdiqi → rezervasiya axını hələ yoxlanmayıb.

API yalnız `RENTACAR_ENABLED=true` və `RENTACAR_ISOLATED_DB=true` birlikdə olduqda aktivdir. `VERCEL_ENV=production` olduqda hər halda bağlıdır. Bu dəyişənləri mövcud canlı bazaya yönələn mühitdə aktivləşdirmək olmaz.

Miqrasiya build skriptinə qoşulmayıb. Əvvəlcə ayrıca test bazasının ünvanı etibarlı mühit konfiqurasiyası ilə verilməli, mövcud əsas schema/auth sxemi həmin ayrıca bazada yaradılmalı, sonra:

```sh
RENTACAR_ISOLATED_DB=true node server/rentacar-migrate.mjs
```

Miqrasiya mövcud Sığorta/listings/users cədvəllərini dəyişmir. Təkrar işə salınması test edilib. Canlı məlumatlara heç bir manual miqrasiya və ya test yazısı göndərilməyib.

### Məhdudiyyətlər / növbəti mərhələ

- Ayrı uzaq test bazasının qoşulması və real browser sessiyaları ilə tam sahib/admin/icarəçi axınının yoxlanması.
- Şəkillər ilkin mərhələdə HTTPS URL-lərlə əlavə edilir; telefondan birbaşa rental şəkil yükləmə interfeysi hələ yoxdur.
- Sahib yoxlaması adminin əl ilə qərarı və audit qeydi ilə aparılır; avtomatik şəxsiyyət və sənəd yoxlama xidməti yoxdur.
- Ödəniş, SMS/email rezervasiya bildirişləri, əlavə sığorta və müqavilə imzalanması qoşulmayıb.
- Rezervasiya pending olduqda tarix ayrılmır; yalnız sahib/admin təsdiqi intervalı bağlayır. Qiymət ən sərfəli tam günlük/həftəlik/30 günlük paket birləşməsi ilə hesablanır. Depozit ayrıca göstərilir; ödəniş alındığı iddia edilmir.
- İctimai kataloq ən çox 100, panel siyahıları ən çox 200 qeyd göstərir; geniş miqyaslı istifadə üçün səhifələmə ayrıca tamamlanmalıdır.

### Test runner sabitliyi

Paralel `--test-force-exit` rejimində frontend suite bəzən axırıncı testləri icra etmədən 0 exit code qaytarırdı (say 213/226 kimi dəyişirdi). Eyni kod ardıcıl rejimdə 234 testi tamamlayır. `npm test` üçün `--test-concurrency=1` və 60 saniyəlik test timeout əlavə edildi; bundan sonra CI-də yalnız yaşıl status deyil, tam test sayı da yoxlanmalıdır.

## 2026-11-14 — işlək idarəetmə və canlı buraxılış hazırlığı

İstifadəçi bu mərhələdə panellərin tamamlanmasını və canlıya buraxılmasını açıq şəkildə istədi.

- Admin idarəetməsi mövcud premium mərkəzin Rent a Car menyusundadır. Statistika, status filtri, sahib yoxlama forması, elan moderasiyası və rezervasiya keçidləri əlavə olundu. Rent a Car sahib panelində ikinci admin paneli yaradılmır; admin mərkəzinə keçid göstərilir.
- Sahib paneli: öz avtomobilləri, gələn sorğular, şəxsi icarələr, tərəfdaş profili; şəkil yükləmə, elan yaratma/redaktə/arxiv, profilin yenidən yoxlanması.
- Şəkillər mövcud S3/R2 konfiqurasiyası ilə `rentals/test/` və `rentals/live/` qovluqlarına, ayrıca rental_media cədvəlinə yazılır. Digər elanların şəkillərinə toxunulmur.
- Yeni rezervasiya, qərar və moderasiya bildirişləri mövcud sayt daxili notifications cədvəlinə transaction daxilində yazılır. Email/SMS çatdırılması qoşulmayıb.
- Şirkət üzrə filtr qorunur; elan təqvimində təsdiqli intervallar göstərilir. İcarəçi əlaqə telefonu rezervasiyada yalnız səlahiyyətli panellərə göstərilir.
- Aktiv təsdiqli rezervasiyası olan elanı sahib dəyişə/arxivləyə bilmir. Elan redaktəsi yeni moderasiya tələb edir; profil dəyişməsi yeni sahib yoxlaması tələb edir.
- Neon test budağı: `br-sweet-fog-aupo05mh`, `sosavto-rentacar-test-20261114`, parent production branch. Yeni schema yalnız bu ayrıca budaqda tətbiq və yoxlanılıb. Vercel-də DATABASE_URL yalnız `feat/rentacar-replace-insurance` preview budağı üçün ayrıca konfiqurasiya edilib.
- Canlı rejim üçün həm `RENTACAR_ENABLED=true`, həm `RENTACAR_PRODUCTION_APPROVED=true` tələb olunur. Sadəcə preview/isolated flag canlı modulu aça bilməz. Təsdiqli mühitdə build yalnız additive rental schema miqrasiyasını transaction daxilində tətbiq edir. Miqrasiya alınmasa build dayanır.
- Son yerli yoxlama: 243/243 test keçdi. Tam browser/preview və son CI/deploy statusları buraxılış nəticəsində ayrıca qeyd olunmalıdır.
