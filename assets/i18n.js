const STRINGS = {
  "Elanlar": {en:"Listings",ru:"Объявления"},
  "Servis xəritəsi": {en:"Service map",ru:"Карта сервисов"},
  "AI köməkçi": {en:"AI assistant",ru:"ИИ-помощник"},
  "Seçilmişlər": {en:"Favorites",ru:"Избранное"},
  "Daxil ol": {en:"Log in",ru:"Войти"},
  "Elan ver": {en:"Post an ad",ru:"Подать объявление"},
  "Məzmuna keç": {en:"Skip to content",ru:"Перейти к содержимому"},
  "SosAvto yüklənir…": {en:"Loading SosAvto…",ru:"Загрузка SosAvto…"},
  "Avtomobillər": {en:"Cars",ru:"Автомобили"},
  "Bütün elanlar": {en:"All listings",ru:"Все объявления"},
  "Ehtiyat hissələri": {en:"Spare parts",ru:"Запчасти"},
  "Usta və servis": {en:"Mechanics & service",ru:"Мастера и сервис"},
  "Avtoyuma": {en:"Car wash",ru:"Автомойка"},
  "Detailing": {en:"Detailing",ru:"Детейлинг"},
  "Sığorta": {en:"Insurance",ru:"Страхование"},
  "Avtomobil nömrələri": {en:"License plates",ru:"Автомобильные номера"},
  "Marka": {en:"Make",ru:"Марка"},
  "Model": {en:"Model",ru:"Модель"},
  "Seçin": {en:"Select",ru:"Выберите"},
  "Hamısı": {en:"All",ru:"Все"},
  "Axtar": {en:"Search",ru:"Поиск"},
  "Ətraflı axtarış": {en:"Advanced search",ru:"Расширенный поиск"},
  "Qiymət": {en:"Price",ru:"Цена"},
  "Şəhər": {en:"City",ru:"Город"},
  "İl": {en:"Year",ru:"Год"},
  "Yürüş": {en:"Mileage",ru:"Пробег"},
  "Yanacaq": {en:"Fuel",ru:"Топливо"},
  "Sürətlər qutusu": {en:"Transmission",ru:"Коробка передач"},
  "Ban növü": {en:"Body type",ru:"Тип кузова"},
  "Yenidən yoxla": {en:"Try again",ru:"Повторить"},
  "Yüklənir…": {en:"Loading…",ru:"Загрузка…"},
  "Şəxsi kabinet": {en:"Personal account",ru:"Личный кабинет"},
  "Profilim": {en:"My profile",ru:"Мой профиль"},
  "Mənim elanlarım": {en:"My listings",ru:"Мои объявления"},
  "Bildirişlər": {en:"Notifications",ru:"Уведомления"},
  "İdarəetmə": {en:"Admin panel",ru:"Панель управления"},
  "Çıxış": {en:"Log out",ru:"Выйти"},
  "Satılıb": {en:"Sold",ru:"Продано"},
  "Aktiv": {en:"Active",ru:"Активно"},
  "Yoxlanılır": {en:"Under review",ru:"На проверке"},
  "Rədd edilib": {en:"Rejected",ru:"Отклонено"},
  "Arxivdə": {en:"Archived",ru:"В архиве"},
  "Kredit kalkulyatoru": {en:"Loan calculator",ru:"Кредитный калькулятор"},
  "Xəritə": {en:"Map",ru:"Карта"},
  "Haqqımızda": {en:"About us",ru:"О нас"},
  "Əlaqə": {en:"Contact",ru:"Контакты"},
  "İstifadə şərtləri": {en:"Terms of use",ru:"Условия использования"},
  "Məxfilik": {en:"Privacy",ru:"Конфиденциальность"},
  "Avtomobilin üçün hər şey bir ünvanda.": {en:"Everything for your car in one place.",ru:"Всё для вашего автомобиля в одном месте."},
  "Yenidən cəhd et": {en:"Try again",ru:"Попробовать снова"},
  "Elan tapılmadı": {en:"No listings found",ru:"Объявления не найдены"},
  "Elan haqqında": {en:"About the listing",ru:"Об объявлении"},
  "Əlaqə saxla": {en:"Contact",ru:"Связаться"},
  "Növbəti": {en:"Next",ru:"Далее"},
  "Geri": {en:"Back",ru:"Назад"},
  "Ləğv et": {en:"Cancel",ru:"Отмена"},
  "Yadda saxla": {en:"Save",ru:"Сохранить"},
  "Təsdiq et": {en:"Confirm",ru:"Подтвердить"},
  "Sil": {en:"Delete",ru:"Удалить"},
  "Düzəliş et": {en:"Edit",ru:"Изменить"}
};
const LANG_KEY = "sosavto-language";
const reverse = {};
for (const [az, translations] of Object.entries(STRINGS)) {
  reverse[translations.en] = az;
  reverse[translations.ru] = az;
}
function translateText(text, lang) {
  const trimmed = text.trim();
  if (!trimmed) return text;
  const az = reverse[trimmed] || trimmed;
  const translated = lang === "az" ? az : STRINGS[az]?.[lang];
  if (!translated) return text;
  return text.replace(trimmed, translated);
}
function excluded(node) {
  return node.closest("script,style,textarea,input,select,option,.card,.listing-title,[data-user-content],.user-content");
}
function applyLanguage(lang) {
  const root = document.documentElement;
  root.lang = lang;
  document.querySelectorAll("body *").forEach(el => {
    if (el.children.length === 0 && !excluded(el)) {
      for (const node of el.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) node.nodeValue = translateText(node.nodeValue, lang);
      }
    }
    if (el.hasAttribute("placeholder")) {
      const original = el.getAttribute("data-i18n-placeholder") || el.getAttribute("placeholder");
      if (!el.hasAttribute("data-i18n-placeholder")) el.setAttribute("data-i18n-placeholder", original);
      el.setAttribute("placeholder", translateText(original, lang));
    }
    for (const attr of ["aria-label", "title"]) {
      if (!el.hasAttribute(attr)) continue;
      const key = "data-i18n-" + attr;
      const original = el.getAttribute(key) || el.getAttribute(attr);
      if (!el.hasAttribute(key)) el.setAttribute(key, original);
      el.setAttribute(attr, translateText(original, lang));
    }
  });
  const picker = document.getElementById("site-language");
  if (picker && picker.value !== lang) picker.value = lang;
}
export function initLanguage() {
  const picker = document.getElementById("site-language");
  if (!picker) return;
  let lang = localStorage.getItem(LANG_KEY) || "az";
  if (!["az", "en", "ru"].includes(lang)) lang = "az";
  picker.value = lang;
  applyLanguage(lang);
  picker.onchange = () => {
    lang = picker.value;
    localStorage.setItem(LANG_KEY, lang);
    applyLanguage(lang);
  };
  if (!window.__sosavtoLanguageObserver) {
    window.__sosavtoLanguageObserver = new MutationObserver(() => applyLanguage(localStorage.getItem(LANG_KEY) || "az"));
    window.__sosavtoLanguageObserver.observe(document.body, {childList:true,subtree:true});
  }
}
