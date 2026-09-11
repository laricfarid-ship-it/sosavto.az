# SosAvto.az

Azərbaycan avtomobil marketplace-i üçün server əsaslı ilk işlək mərhələ. Mövcud HTML ünvanları və qara/mavi vizual üslub qorunur. Əvvəlki localStorage prototipi real PostgreSQL API-yə dəyişdirilib.

## Hazır olan axınlar

- Qeydiyyat, giriş, çıxış: bcrypt (12), HttpOnly/SameSite sessiya cookie-si, server tərəfdə icazə yoxlaması. Production cookie Secure-dır.
- Profil və şifrə dəyişmə; şifrə dəyişəndə digər sessiyalar bağlanır.
- Elan yaratma/redaktə/silmə, status dəyişmə. Yalnız sahibi dəyişdirə bilər. Yaradılan/redaktə olunan elan yoxlanışa gedir.
- Çoxsaylı şəkil: 8 ədədədək, 3 MB limit, fayl məzmununun yoxlanması, WebP, EXIF təmizlənməsi, maksimum 1600×1200, əsas şəkil seçmə. Production üçün S3/R2 tələb olunur.
- Marka/model/il/qiymət/şəhər/yanacaq/transmissiya/ban/vəziyyət/yürüş/kredit/barter filtrləri, URL parametrləri, sıralama və səhifələmə.
- Elan səhifəsi, qalereya, telefon, WhatsApp, paylaşma, şikayət.
- Hesaba bağlı favoritlər, yalnız sahibin elanları, baxış və favorit sayları, bildirişlər.
- Admin roluna bağlı moderasiya, rədd səbəbi, istifadəçi bloklama, şikayətlər və əməliyyat jurnalı.
- Elan yerinin xəritədə seçilməsi; aktiv elanların xəritəsi və istifadəçi icazəsi ilə yer təyini.
- AI köməkçi və təsvir yaratma üçün server inteqrasiyası. API açarı və model olmadan dürüst deaktiv vəziyyət. Cavab üçün yalnız təqdim olunan məlumat istifadə olunur; canlı bazar qiymətləndirməsi və hesab əməliyyatları yoxdur.
- Vahid mobil menyu, forma yoxlamaları, təsdiq dialoqu, boş/xəta/yükləmə vəziyyətləri, istifadəçi mətninin HTML-dən qorunması.

## Lokal işlətmə

Node.js 22+ tələb olunur. Lokal rejim real PostgreSQL mühərrikinin PGlite variantını diskdə işlədir; məlumatlar browser-də saxlanmır. Bu rejim Vercel/production üçün qəsdən qadağandır.

```bash
npm ci
LOCAL_DATABASE=true npm run migrate
LOCAL_DATABASE=true APP_ORIGIN=http://localhost:4173 npm run dev
```

Brauzerdə `http://localhost:4173` açın. Hesab yaradın. Öz qeydiyyatdan keçmiş hesabınızı admin etmək üçün ayrıca terminalda:

```bash
LOCAL_DATABASE=true npm run admin -- your-registered-email@example.com
```

Hazır admin şifrəsi, standart hesab və uydurma production elanları yaradılmır. `.data/` yalnız lokal məlumatdır və Git-ə daxil edilmir.

## Vercel sınaq versiyası

Bu kod mövcud Vercel layihəsi üçün hazırlanıb. Production-a birləşdirmədən əvvəl ayrı preview yaradın.

1. Hosted PostgreSQL bazası yaradın. TLS yoxlamasını söndürməyən bağlantını `DATABASE_URL` olaraq Vercel Environment Variables-a əlavə edin.
2. Sxemi həmin bazada bir dəfə tətbiq edin: mühitdə `DATABASE_URL` quraşdırıldıqdan sonra `npm run migrate`. Skript `.env`-i avtomatik oxumur; shell və ya Node `--env-file` istifadə edin. Secret-ləri komanda tarixçəsinə yazmayın.
3. `APP_ORIGIN` dəyərini yoxlanılan dəqiq preview ünvanına qoyun. Ayrı preview domeni üçün ayrıca env dəyəri lazımdır. Production dəyəri `https://sosavto-az.vercel.app` olacaq. Origin yoxlaması wildcard və gələn Host başlığını etibarlı saymır.
4. S3/R2 bucket və public media CDN-i hazırlayın. `.env.example`-dəki S3 parametrlərini Vercel-ə əlavə edin. Yalnız şəkillər üçün nəzərdə tutulmuş bucket istifadə edin.
5. AI üçün `OPENAI_API_KEY` və hesabda mövcud olan `OPENAI_MODEL` əlavə edin. Açar browser-ə verilmir. Provider xərcləri ayrıca limitlənməlidir. AI istifadəçi üçün gündə 20, platforma üçün gündə 200 sorğu ilə məhduddur.
6. Vercel layihəsinin Framework Preset-i **Other**, Build Command `npm run build`, Output Directory `public` olsun; bunlar `vercel.json`-da verilib. Node.js 22+ seçin.
7. Admin hesabını qeydiyyatdan keçirin və etibarlı server mühitindən `npm run admin -- email` ilə rol verin. Heç vaxt frontend-də rol/şifrə yazmayın.
8. Qeydiyyat → şəkilli elan → admin təsdiqi → başqa hesabdan axtarış/favori/telefon → redaktə → təkrar təsdiq axınını preview-da yoxlayın.

`public/` yalnız saytın HTML/CSS/JS və ikonlarını ehtiva edir. `server/`, testlər və konfiqurasiya static output-a kopyalanmır. Vercel `/api/*` sorğularını ayrıca Node serverless funksiyasına ötürür.

API konfiqurasiyası olmadan məlumatların uğurla saxlandığı göstərilmir; düzgün xəta çıxır. Production bazası/S3/AI bu repository-ni dəyişməklə avtomatik yaradılmır.

## Yoxlama

```bash
npm test
npm run build
```

17 API integration testi PostgreSQL-compatible PGlite ilə qeydiyyat/hash/sessiya/CSRF, owner icazələri, elanlar, SQL filtrləri, moderasiya, favoritlər, şəkil məzmunu və owner əlaqəsi, bildiriş, şikayət, şifrə/logout, bloklama və rate-limit axınlarını yoxlayır. 8 DOM testi əsas səhifə, URL model asılılığı, HTML escaping, xəta vəziyyəti, formalar, detal, admin məhdudiyyəti və AI deaktiv vəziyyətini yoxlayır.

Bu testlər canlı PostgreSQL/S3/OpenAI/Vercel inteqrasiyası və real browser vizual yoxlamasının əvəzi deyil. Xarici xidmətlər qoşulmadan həmin yoxlamalar aparılmayıb.

## Production-dan əvvəl qalanlar

PDF planındakı sonrakı mərhələlər bu dəyişiklikdə tamamlanmış hesab olunmur:

- Email/telefon təsdiqi, parol sıfırlama üçün email/SMS provider və admin üçün 2FA.
- Sitemap, serverdən render olunan elan metadata-sı/structured data və insan oxuyan SEO URL-ləri.
- Salon profilləri, təsdiqlənmiş biznes nişanı, rəylər/reytinqlər.
- Daxili mesajlaşma və email/SMS/push bildirişləri.
- VIP, ödəniş, abunəlik və provider webhook-ları.
- AI ilə real elan axtarışı, bazar qiyməti analizi, moderasiya və saxtakarlıq aşkarlama.
- Hosted bazanın avtomatik backup/PITR, bərpa sınağı, monitorinq və alertlər.
- Rate-limit/session/upload orphan təmizliyi üçün planlaşdırılmış maintenance. Media silmə hal-hazırda DB əlaqəsini silir; bucket obyektləri üçün ayrıca retention/cleanup qaydası lazımdır.
- Eyni vaxtda moderasiya/redaktə/bloklama üçün daha geniş concurrency və yük testləri.

Baxış sayı səhifənin açılma sayıdır, unikal ziyarətçi və saxtalaşdırmadan qorunan analitika deyil. Xəritə ilk 500 uyğun koordinatlı elanı göstərir. Admin istifadəçi və jurnal siyahıları son 100 qeydlə məhdudlaşdırılıb.

## Arxitektura

`assets/app.js` → `/api/index.mjs` → `server/db.mjs` → PostgreSQL.

`server/schema.sql` təkrar tətbiq edilə bilən ilkin sxemdir. Sonrakı sxem dəyişiklikləri üçün versiyalı migration-lar əlavə olunmalıdır. `server/uploads.mjs` şəkli yoxlayır və S3-compatible storage-a göndərir. `.env.example` yalnız boş parametr adlarını ehtiva edir.

AI inteqrasiyası OpenAI Responses API-nin rəsmi sənədinə əsaslanır: https://developers.openai.com/api/docs/guides/text
