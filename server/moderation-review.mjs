const levels = { low: 0, medium: 1, high: 2 };

export function reviewListing(listing = {}) {
  const flags = [];
  const imageCount = Number(listing.image_count ?? 0);
  const duplicateCount = Number(listing.duplicate_count ?? 0);
  const pendingCount = Number(listing.seller_pending_count ?? 0);
  const price = Number(listing.price ?? 0);
  const referencePrice = Number(listing.reference_price ?? 0);

  if (!Number.isFinite(imageCount) || imageCount < 1) {
    flags.push({
      code: 'no-images',
      level: 'medium',
      title: 'Şəkil yoxdur',
      detail: 'Elan dərc edilməzdən əvvəl satıcıdan avtomobilə və ya məhsula aid şəkil istənilməsi tövsiyə olunur.'
    });
  }

  if (Number.isFinite(duplicateCount) && duplicateCount > 0) {
    flags.push({
      code: 'possible-duplicate',
      level: 'high',
      title: 'Mümkün təkrar elan',
      detail: 'Eyni başlıq və ya eyni şəkillər başqa aktiv/gözləyən elanda da tapılıb. Hər iki elanı müqayisə edin.'
    });
  }

  if (Number.isFinite(pendingCount) && pendingCount >= 5) {
    flags.push({
      code: 'many-pending',
      level: 'medium',
      title: 'Hesabda çoxlu gözləyən elan',
      detail: 'Bu hesabdan ən azı 5 elan yoxlanış gözləyir. Hesab fəaliyyətini nəzərdən keçirin.'
    });
  }

  if (Number.isFinite(price) && price > 0 && Number.isFinite(referencePrice) && referencePrice > 0) {
    if (price < referencePrice * 0.5) {
      flags.push({
        code: 'price-low',
        level: 'medium',
        title: 'Qiymət oxşar elanlardan xeyli aşağıdır',
        detail: 'Müqayisə bazasının median qiymətindən 50%-dən çox aşağıdır. Bu, təkbaşına saxtakarlıq sübutu deyil.'
      });
    } else if (price > referencePrice * 1.8) {
      flags.push({
        code: 'price-high',
        level: 'medium',
        title: 'Qiymət oxşar elanlardan xeyli yuxarıdır',
        detail: 'Müqayisə bazasının median qiymətindən 80%-dən çox yuxarıdır. Avtomobilin komplektasiyasını və məlumatları yoxlayın.'
      });
    }
  }

  const risk = flags.reduce((current, flag) => levels[flag.level] > levels[current] ? flag.level : current, 'low');
  return {
    risk,
    riskLabel: risk === 'high' ? 'Yüksək risk' : risk === 'medium' ? 'Əlavə yoxlama' : 'Aşkar risk yoxdur',
    flags
  };
}
