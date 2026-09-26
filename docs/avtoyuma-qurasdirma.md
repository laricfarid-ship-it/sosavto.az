# Avtoyuma rezervasiyası — quraşdırma və qalan işlər

Bu dəyişiklik `WASH_ENABLED=true` olmayanda əsas saytdakı hazırkı avtoyuma elanlarını dəyişmir. 26 sentyabr 2026 tarixində istifadəçi əsas sayta yayımı təsdiqlədi. Production yayımında modul ilkin olaraq açıqdır; WASH_ENABLED=false onu bağlayır.

## Hazır olan hissə

- `/avtoyuma.html`: GPS icazəsi ilə canlı mövqe, yaxınlığa görə sıralama, 5/10 km filtr, ad/məsafə/reytinq/ən yaxın boş vaxt kartları.
- `/avtoyuma-panel.html`: elan sahibinin qiymət, avtomobil ölçüsü, əlavə xidmət, müddət, saat və yer sayı paneli.
- Boş yerlər və rezervlər görünən səhifədə 15 saniyəlik sorğularla yenilənir. Yer saxlanarkən server kilidi son yeri iki nəfərə vermir.
- Yer maksimum 10 dəqiqə müvəqqəti saxlanılır, müştəri nağd rezervi ayrıca təsdiqləyir. Müddəti bitmiş saxlamalar dərhal tutum hesabından çıxır.
- Qiymət serverdə qəpiklə hesablanır. Seçilmiş xidmətlər/qiymət/ölçü/şərtlər rezervdə ayrıca saxlanır və qiymət dəyişikliyi əvvəlki rezervə təsir etmir.
- Gəlişi sahib, tamamlanmanı müştəri qeyd edir. Tamamlanmış rezervə yalnız müştəri rəy yaza bilir.
- Zəng, WhatsApp, Waze universal keçidi və ayrıca `waze://` keçidi. Telefon nömrəsi avtoyuma elanından götürülür.

## Preview hazırlığı

1. Preview üçün ayrıca Neon test bazası/branch istifadə edin. Production bazasının bağlantısını preview-a köçürməyin.
2. Mövcud baza sxemindən sonra həmin bazada `npm run migrate:wash` işlədin. Neon SQL Editor üçün eyni fayl: `server/wash-schema.sql`.
3. Preview `DATABASE_URL`, həmin preview domeninə uyğun `APP_ORIGIN`, `WASH_ENABLED=true` təyin edin və preview deploy edin. Production-da hələ aktivləşdirməyin.
4. İki test hesabı yaradın: sahib və müştəri. Sahibin avtoyuma elanı admin tərəfindən təsdiqlənməli, koordinatları doldurulmalıdır.
5. Sahib qiymətləri, xidmət müddətlərini, saat aralıqlarını saxlasın. Nağd rezerv istəyirsə ayrıca seçimi açsın. Bu seçim ilkin olaraq bağlıdır.
6. Müştəri yer saxlasın, sonra “Rezervlərim”də təsdiqləsin. Digər hesabla eyni son yeri almağın mümkün olmadığını yoxlayın. Sahibdə eyni məbləğ/xidmət siyahısını yoxlayın.
7. Ləğv, vaxtı keçmiş saxlama, gəliş/tamamlanma və rəy axınını yoxlayın. Canlı PostgreSQL-də paralel sorğu sınağı da aparılmalıdır; avtomatlaşdırılmış testlər PGlite üzərindədir.

## Real məlumat tələb edən hissələr

- **Məhəllələr:** Badamdar/Yasamal üçün təsdiqlənmiş həqiqi sərhədlər verilməyib. Uydurma sərhədlər əlavə edilməyib. Admin sessiyası ilə `POST /api/wash/zones` `{name, ring}` qəbul edir. `ring` qapalı `[uzunluq,enlik]` polygon halqasıdır; son nöqtə birinciyə bərabər olmalıdır. Məlumatın lisenziyası və sərhədi yoxlanmalıdır. Bunlar əlavə edilənə qədər məkan/məsafə işləyir, dəqiq zona adı göstərilmir.
- **GPS:** HTTPS və istifadəçi icazəsi lazımdır. Veb səhifə açıq ikən izləyir; bağlanmış tətbiqdə/background davamlı GPS vəd edilmir. Dəqiqlik 500 metrdən pisdirsə yanlış zona göstərmək əvəzinə xəbər verilir. Müştərinin koordinatları serverə göndərilmir.
- **Fiziki yerlər:** tutum saytdakı rezervlər və sahibin “Kənardan gələn / bağlı yer” qeydlərinə əsaslanır. Sensor/POS inteqrasiyası yoxdur. Sahib kənar müştəriləri qeyd etməsə, sistem onların yer tutduğunu bilmir.
- **Saatlar:** bir aralıq bir qəbul pəncərəsidir, məsələn 10:00–11:00. Yer sayı həmin pəncərədə paralel qəbul sayıdır. 10:00–15:00 aralığı avtomatik beş ayrı saata bölünmür. Müddətlər seçilmiş xidmətlər üzrə toplanır və aralığa sığmalıdır. Bütün saatlar Asia/Baku ilə göstərilir.

## Kartla ödəniş — hazır deyil

Payriff/Kapital merchant hesabı və provayder seçimi yoxdur. `/api/wash/hold` `method=card` üçün 503 qaytarır; kart məlumatı toplanmır, saxta uğurlu ödəniş göstərilmir. Kart inteqrasiyası yazılmayıb.

Tamamlamaq üçün: merchant müqaviləsi/test hesabı, rəsmi API/webhook sənədləri və təhlükəsiz mühit dəyişənləri lazımdır. Pulun platformaya, yoxsa hər avtoyumanın merchant hesabına köçməsi, komissiya, ləğv və geri qaytarma qaydaları müəyyən edilməlidir.

Tətbiq ediləcək ardıcıllıq:

1. Server yer kilidi + qısa saxlama yaradır, qiyməti yenidən hesablayır.
2. Server provayderdə idempotent sifariş yaradır, müştəri provayderin checkout səhifəsinə keçir.
3. İmzalı webhook və/və ya serverdən provayder status yoxlaması merchant/sifariş/məbləğ/AZN uyğunluğunu təsdiqləyir. Müştəri return URL-i ödəniş sübutu deyil.
4. Etibarlı uğurlu nəticə bir dəfə təsdiqlənmiş rezervə keçir. Gecikmiş ödənişdə bitmiş yer yenidən yoxlanılır; yer yoxdursa qaytarma prosesi işləməlidir.
5. Dublikat webhook, uğursuz/gecikmiş ödəniş, refund, reconciliation testləri tamamlanmadan production kart qəbulu açılmır.

## Yoxlama

`npm test` və `npm run build`. Backend sınaqları: giriş/CSRF/sahiblik, son yerə paralel müraciət, idempotency, qiymət müdaxiləsi, saxlamanın bitməsi, tutum, xidmət qəbzi, ləğv/gəliş/rəy. İnterfeys sınaqları: GPS, zona/məsafə, kartlarda doluluq, SUV/əlavə xidmət cəmi, son yerdən sonra düymənin bağlanması.

Bu mühitin cloud brauzeri localhost-u `ERR_BLOCKED_BY_CLIENT` ilə açmadığı üçün vizual mobil yoxlama hələ tamamlanmayıb. Preview-da real telefonla GPS icazəsi, Waze/WhatsApp keçidləri və mobil görünüş ayrıca yoxlanmalıdır.

## Kart hissəsinin hazırlıq vəziyyəti — 26 sentyabr 2026

İstifadəçinin qərarı: kart qəbulu saytın məzmunu, domen və rəsmi fəaliyyət hazırlığı tamamlandıqdan sonra aktivləşdiriləcək. Hazırda merchant açmaq və ya canlı ödəniş başlatmaq lazım deyil.

Müştəri formasında nağd və bağlı “Kartla ödəniş — tezliklə” seçimi var. Sahib panelində kartın bağlı vəziyyəti göstərilir. Qəbzdə rezerv statusundan ayrı ödəniş statusu göstərilir. `assets/wash-payment.js` ödənilməmiş, ödənilmiş və geri qaytarma vəziyyətlərinin yazılarını saxlayır. Bunlar vəziyyətin göstərilməsidir; ödəniş/refund əməliyyatı həyata keçirmir.

`server/wash-payments.mjs` kartın əlçatanlıq qaydasını mərkəzləşdirir. `GET /api/wash/payment-options` kartı bağlı qaytarır. Təkcə mühit dəyişəni yazmaq kartı açmır; real adapter, merchant bağlantısı və sınaqlar əlavə edilməlidir. Formada kart nömrəsi/CVV sahəsi yoxdur.

## Production yayımı

İstifadəçinin açıq göstərişi ilə əsas sayta yayım hazırlanıb. Vercel production build mövcud DATABASE_URL vasitəsilə yalnız əlavə wash cədvəllərini yaradır; xəta build-i dayandırır və köhnə deployment qalır. Migration tranzaksiyası 5 saniyə lock və 20 saniyə statement timeout istifadə edir. Production üçün default aktivdir, WASH_ENABLED=false təcili bağlama seçimidir. Preview avtomatik açılmır. Kart ödənişi bütün mühitlərdə bağlı qalır. Menyuda Avtoyuma keçidi var.
