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
