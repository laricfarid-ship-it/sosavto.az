const STORAGE_KEY = 'sosavto_language';
const LANGUAGES = ['az', 'en', 'ru'];
const DICTIONARY = {
  az: {},
  en: {
    'Elanlar':'Listings','Servis xəritəsi':'Service map','AI köməkçi':'AI assistant','Seçilmişlər':'Favorites','Daxil ol':'Sign in','Elan ver':'Post an ad',
    'İşıqlı rejimə keç':'Switch to light mode','Tünd rejimə keç':'Switch to dark mode','Menyunu aç':'Open menu','Məzmuna keç':'Skip to content',
    'Avtomobilin üçün hər şey bir ünvanda.':'Everything for your car in one place.','Kredit kalkulyatoru':'Loan calculator','Xəritə':'Map','Haqqımızda':'About us','Əlaqə':'Contact','İstifadə şərtləri':'Terms of use','Məxfilik':'Privacy',
    'Bütün elanlar':'All listings','Avtomobillər':'Cars','Ehtiyat hissələri':'Spare parts','Usta və servis':'Mechanics & services','Avtoyuma':'Car wash','Detailing':'Detailing','Sığorta':'Insurance','Avtomobil nömrələri':'License plates',
    'Yoxlanılır':'Under review','Aktiv':'Active','Rədd edilib':'Rejected','Satılıb':'Sold','Arxivdə':'Archived',
    'Yüklənir…':'Loading…','Yüklənir...':'Loading...','Yenidən yoxla':'Try again','Səhifə tapılmadı':'Page not found','Axtardığınız səhifə mövcud deyil.':'The page you are looking for does not exist.',
    'Hesabınıza daxil olun':'Sign in to your account','Elanlarınız və seçilmişləriniz bütün cihazlarda hesabınıza bağlı saxlanılır.':'Your listings and favorites are saved to your account across devices.',
    'Şəxsi kabinet':'Personal account','Profilim':'My profile','Mənim elanlarım':'My listings','Bildirişlər':'Notifications','İdarəetmə':'Admin panel','Çıxış':'Sign out',
    'Redaktə':'Edit','Satıldı':'Mark as sold','Yenidən göndər':'Resubmit','Sil':'Delete','Seçilib':'Selected','Müqayisə et':'Compare','Təmizlə':'Clear',
    'Hamısı':'All','Seçin':'Select','Marka':'Make','Model':'Model','Marka seçin':'Select make','Model seçin':'Select model','Digər — əl ilə yaz':'Other — enter manually',
    'Yanacaq':'Fuel','Sürətlər qutusu':'Transmission','Ban növü':'Body type','Mühərrik (litr)':'Engine (litres)','Rəng':'Color','Ötürücü':'Drivetrain','Vəziyyət':'Condition','Kredit':'Financing','Barter':'Trade-in',
    'Əməliyyat baş tutmadı.':'The operation failed.','Xidmətlə əlaqə qurulmadı. Səhifəni yeniləyin.':'Could not connect to the service. Refresh the page.',
    'Seçilmişlərdən çıxarıldı.':'Removed from favorites.','Seçilmişlərə əlavə edildi. Qiymət düşəndə hesabınızda bildiriş alacaqsınız.':'Added to favorites. You will receive a notification in your account if the price drops.',
    'Maksimum 3 avtomobil müqayisə edə bilərsiniz. Əvvəl birini çıxarın.':'You can compare up to 3 cars. Remove one first.','Müqayisəyə bax':'View comparison','Daha bir avtomobil seçin':'Select one more car',
    'Yan-yana müqayisə':'Side-by-side comparison','Yalnız fərqlər':'Differences only','Avtomobillərə bax':'Browse cars','Avtomobillərə qayıt':'Back to cars',
    'Seçimdən qərara':'From selection to decision','Elan sahiblərinin daxil etdiyi məlumatlar. Boş xanalar təsdiqlənmiş göstərici deyil.':'Information entered by listing owners. Empty fields are not verified values.',
    'Qiymət':'Price','Şəhər':'City','İl':'Year','Yürüş':'Mileage','Əlavə et':'Add','Axtar':'Search','Filtrlər':'Filters','Tətbiq et':'Apply','Sıfırla':'Reset',
    'Əsas səhifə':'Home','Əlaqə saxla':'Contact','Telefon':'Phone','Təsvir':'Description','Şəkillər':'Photos','Qiymət (AZN)':'Price (AZN)',
    'Elan yaradılmadı':'Listing was not created','Məlumatları yoxlayıb yenidən cəhd edin.':'Check the information and try again.',
    'Növbəti':'Next','Əvvəlki':'Previous','Bağla':'Close','Ləğv et':'Cancel','Təsdiq et':'Confirm','Yadda saxla':'Save','Yadda saxlanıldı':'Saved',
    'Xəta baş verdi':'Something went wrong','Uğurlu':'Success','Geri qayıt':'Go back','Davam et':'Continue','Gözləyin…':'Please wait…',
    'İstifadəçi adı':'Username','Şifrə':'Password','Şifrəni unutmusunuz?':'Forgot password?','Qeydiyyatdan keç':'Create account','Qeydiyyat':'Sign up',
    'İstifadə şərtləri':'Terms of use','Məxfilik siyasəti':'Privacy policy','SosAvto yüklənir…':'Loading SosAvto…',
    'Xidmət növü':'Service type','İş saatları':'Opening hours','Detalın növü':'Part type','Sığorta növü':'Insurance type','Sığorta şirkəti':'Insurance company','Qeydiyyat nişanı':'License plate',
    'Yenidən göndərildi':'Resubmitted','Bildiriş yoxdur':'No notifications','Nəticə tapılmadı':'No results found'
  },
  ru: {
    'Elanlar':'Объявления','Servis xəritəsi':'Карта сервисов','AI köməkçi':'ИИ-помощник','Seçilmişlər':'Избранное','Daxil ol':'Войти','Elan ver':'Подать объявление',
    'İşıqlı rejimə keç':'Светлая тема','Tünd rejimə keç':'Тёмная тема','Menyunu aç':'Открыть меню','Məzmuna keç':'Перейти к содержимому',
    'Avtomobilin üçün hər şey bir ünvanda.':'Всё для вашего автомобиля в одном месте.','Kredit kalkulyatoru':'Кредитный калькулятор','Xəritə':'Карта','Haqqımızda':'О нас','Əlaqə':'Контакты','İstifadə şərtləri':'Условия использования','Məxfilik':'Конфиденциальность',
    'Bütün elanlar':'Все объявления','Avtomobillər':'Автомобили','Ehtiyat hissələri':'Запчасти','Usta və servis':'Мастера и сервисы','Avtoyuma':'Автомойка','Detailing':'Детейлинг','Sığorta':'Страхование','Avtomobil nömrələri':'Автомобильные номера',
    'Yoxlanılır':'На проверке','Aktiv':'Активно','Rədd edilib':'Отклонено','Satılıb':'Продано','Arxivdə':'В архиве',
    'Yüklənir…':'Загрузка…','Yüklənir...':'Загрузка...','Yenidən yoxla':'Повторить','Səhifə tapılmadı':'Страница не найдена','Axtardığınız səhifə mövcud deyil.':'Запрашиваемая страница не существует.',
    'Hesabınıza daxil olun':'Войдите в аккаунт','Elanlarınız və seçilmişləriniz bütün cihazlarda hesabınıza bağlı saxlanılır.':'Ваши объявления и избранное сохраняются в аккаунте на всех устройствах.',
    'Şəxsi kabinet':'Личный кабинет','Profilim':'Мой профиль','Mənim elanlarım':'Мои объявления','Bildirişlər':'Уведомления','İdarəetmə':'Панель администратора','Çıxış':'Выйти',
    'Redaktə':'Редактировать','Satıldı':'Отметить как проданное','Yenidən göndər':'Отправить повторно','Sil':'Удалить','Seçilib':'Выбрано','Müqayisə et':'Сравнить','Təmizlə':'Очистить',
    'Hamısı':'Все','Seçin':'Выберите','Marka':'Марка','Model':'Модель','Marka seçin':'Выберите марку','Model seçin':'Выберите модель','Digər — əl ilə yaz':'Другое — ввести вручную',
    'Yanacaq':'Топливо','Sürətlər qutusu':'Коробка передач','Ban növü':'Тип кузова','Mühərrik (litr)':'Двигатель (л)','Rəng':'Цвет','Ötürücü':'Привод','Vəziyyət':'Состояние','Kredit':'Кредит','Barter':'Обмен',
    'Əməliyyat baş tutmadı.':'Не удалось выполнить операцию.','Xidmətlə əlaqə qurulmadı. Səhifəni yeniləyin.':'Не удалось связаться с сервисом. Обновите страницу.',
    'Seçilmişlərdən çıxarıldı.':'Удалено из избранного.','Seçilmişlərə əlavə edildi. Qiymət düşəndə hesabınızda bildiriş alacaqsınız.':'Добавлено в избранное. При снижении цены вы получите уведомление в аккаунте.',
    'Maksimum 3 avtomobil müqayisə edə bilərsiniz. Əvvəl birini çıxarın.':'Можно сравнить не более 3 автомобилей. Сначала удалите один.',
    'Müqayisəyə bax':'Смотреть сравнение','Daha bir avtomobil seçin':'Выберите ещё один автомобиль','Yan-yana müqayisə':'Сравнение рядом','Yalnız fərqlər':'Только различия',
    'Avtomobillərə bax':'Смотреть автомобили','Avtomobillərə qayıt':'Вернуться к автомобилям','Seçimdən qərara':'От выбора к решению',
    'Elan sahiblərinin daxil etdiyi məlumatlar. Boş xanalar təsdiqlənmiş göstərici deyil.':'Данные указаны владельцами объявлений. Пустые поля не являются подтверждёнными показателями.',
    'Qiymət':'Цена','Şəhər':'Город','İl':'Год','Yürüş':'Пробег','Əlavə et':'Добавить','Axtar':'Поиск','Filtrlər':'Фильтры','Tətbiq et':'Применить','Sıfırla':'Сбросить',
    'Əsas səhifə':'Главная','Əlaqə saxla':'Связаться','Telefon':'Телефон','Təsvir':'Описание','Şəkillər':'Фотографии','Qiymət (AZN)':'Цена (AZN)',
    'Növbəti':'Далее','Əvvəlki':'Назад','Bağla':'Закрыть','Ləğv et':'Отмена','Təsdiq et':'Подтвердить','Yadda saxla':'Сохранить','Yadda saxlanıldı':'Сохранено',
    'Xəta baş verdi':'Произошла ошибка','Uğurlu':'Успешно','Geri qayıt':'Назад','Davam et':'Продолжить','Gözləyin…':'Подождите…',
    'İstifadəçi adı':'Имя пользователя','Şifrə':'Пароль','Şifrəni unutmusunuz?':'Забыли пароль?','Qeydiyyatdan keç':'Зарегистрироваться','Qeydiyyat':'Регистрация',
    'İstifadə şərtləri':'Условия использования','Məxfilik siyasəti':'Политика конфиденциальности','SosAvto yüklənir…':'Загрузка SosAvto…',
    'Xidmət növü':'Тип услуги','İş saatları':'Часы работы','Detalın növü':'Тип запчасти','Sığorta növü':'Тип страхования','Sığorta şirkəti':'Страховая компания','Qeydiyyat nişanı':'Номерной знак',
    'Bildiriş yoxdur':'Нет уведомлений','Nəticə tapılmadı':'Результаты не найдены'
  }
};
let current = 'az';
const skipSelector = 'input,textarea,select,option,script,style,code,pre,[contenteditable="true"],.card h3.break,.card .price,.card-meta,.listing-description,[data-user-content],.user-content';
function getLanguage(){return current;}
function t(value){return DICTIONARY[current]?.[value] || value;}
function translateTree(root=document.body){
  if(current==='az'||!root)return;
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  for(const node of nodes){
    if(node.parentElement?.closest(skipSelector))continue;
    const original=node.nodeValue;
    const trimmed=original.trim();
    if(!trimmed)continue;
    const translated=t(trimmed);
    if(translated!==trimmed)node.nodeValue=original.replace(trimmed,translated);
  }
  root.querySelectorAll?.('[placeholder],[aria-label],[title]').forEach(el=>{
    if(el.closest(skipSelector))return;
    for(const attr of ['placeholder','aria-label','title']){
      const value=el.getAttribute(attr);
      if(value&&t(value)!==value)el.setAttribute(attr,t(value));
    }
  });
}
function setLanguage(lang){
  if(!LANGUAGES.includes(lang))return;
  current=lang;
  try{localStorage.setItem(STORAGE_KEY,lang);}catch{}
  document.documentElement.lang=lang;
  document.documentElement.dataset.language=lang;
  translateTree();
  document.querySelectorAll('[data-language-picker]').forEach(el=>{el.value=lang;el.setAttribute('aria-label',lang==='az'?'Saytın dili':lang==='en'?'Site language':'Язык сайта');});
  document.dispatchEvent(new CustomEvent('sosavto:languagechange',{detail:{language:lang}}));
}
function mountLanguagePicker(){
  const actions=document.querySelector('.nav-actions');
  if(!actions||actions.querySelector('[data-language-picker]'))return;
  const wrap=document.createElement('label');
  wrap.className='language-picker';
  wrap.title='Saytın dili / Site language / Язык сайта';
  wrap.innerHTML='<span class="language-globe" aria-hidden="true">◎</span><select data-language-picker aria-label="Saytın dili"><option value="az">AZ</option><option value="en">EN</option><option value="ru">RU</option></select>';
  const theme=actions.querySelector('.theme-toggle');
  actions.insertBefore(wrap,theme||actions.firstChild);
  wrap.querySelector('select').addEventListener('change',e=>setLanguage(e.target.value));
  wrap.querySelector('select').value=current;
}
function initI18n(){
  try{const saved=localStorage.getItem(STORAGE_KEY);if(LANGUAGES.includes(saved))current=saved;}catch{}
  mountLanguagePicker();
  setLanguage(current);
  if(!window.__sosavtoI18nObserver){
    const observer=new MutationObserver(records=>{
      for(const record of records){
        if(record.type==='childList')record.addedNodes.forEach(node=>{if(node.nodeType===Node.ELEMENT_NODE)translateTree(node);else if(node.nodeType===Node.TEXT_NODE){const p=node.parentElement;if(p&&!p.closest(skipSelector)){const old=node.nodeValue.trim();if(old){const translated=t(old);if(old!==translated)node.nodeValue=node.nodeValue.replace(old,translated);}}}});
      }
    });
    observer.observe(document.body,{childList:true,subtree:true});
    window.__sosavtoI18nObserver=observer;
  }
}
export {getLanguage,t,setLanguage,translateTree,mountLanguagePicker,initI18n};
