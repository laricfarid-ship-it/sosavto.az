// Shared by forms and the API so category-specific values stay consistent.
export const vehicleTypes=['Avtomobil üçün','Motosiklet üçün','Hər ikisi üçün'];
export const partTypes=['Mühərrik və hissələri','Sürətlər qutusu','Asqı və sükan','Əyləc sistemi','Elektrik və elektronika','Kuzov və optika','Salon','Təkər və disk','Yağ və filtrlər','Aksesuar','Digər'];
export const insuranceTypes=['İcbari sığorta','KASKO','Yaşıl Kart','Digər'];
export const serviceTypes={
 service:['Diaqnostika','Mühərrik təmiri','Elektrik','Asqı və əyləc','Sürətlər qutusu','Təkər xidməti','Kondisioner','Kuzov və rəngləmə','Evakuator','Digər'],
 wash:['Xarici yuma','Salon təmizliyi','Kompleks yuma','Özünəxidmət','Mühərrik yuma','Digər'],
 detailing:['Cilalama','Keramika örtüyü','Qoruyucu plyonka (PPF)','Kimyəvi təmizləmə','Şüşə tonlama','Faraların bərpası','Digər']
};
export const detailFields={
 motorcycle:['engine','color','condition','credit','barter'],
 car:['fuel','transmission','body','engine','color','drive','condition','credit','barter'],
 parts:['vehicle_type','condition','part_type','oem','fitment','map_visible'],
 service:['vehicle_type','service_type','hours'],wash:['vehicle_type','service_type','hours'],detailing:['vehicle_type','service_type','hours'],
 insurance:['insurance_type','insurer'],plates:['plate_number']
};
export const detailLabels={vehicle_type:'Nəqliyyat növü',map_visible:'Servis xəritəsində mağaza',fuel:'Yanacaq',transmission:'Sürətlər qutusu',body:'Ban növü',engine:'Mühərrik (litr)',color:'Rəng',drive:'Ötürücü',condition:'Vəziyyət',credit:'Kredit',barter:'Barter',part_type:'Detalın növü',oem:'Detal kodu (OEM)',fitment:'Uyğunluq qeydi',service_type:'Xidmət növü',hours:'İş saatları',insurance_type:'Sığorta növü',insurer:'Sığorta şirkəti',plate_number:'Qeydiyyat nişanı'};
export const plateNotice='Elan rəsmi nömrə keçirilməsi demək deyil. Ödənişdən əvvəl nişanın keçirilmə imkanını və rəsmiləşdirmə qaydasını DYP-də dəqiqləşdirin.';
export const normalizeCode=v=>String(v??'').trim().toUpperCase().replace(/[\s-]/g,'');
export const normalizePlate=v=>{const s=normalizeCode(v);return /^\d{2}[A-Z]{2}\d{3}$/.test(s)?`${s.slice(0,2)}-${s.slice(2,4)}-${s.slice(4)}`:s;};
export function filterKeys(category){
 const common=['q','city','price_min','price_max','sort','page','category'];
 if(category==='car'||category==='motorcycle'||!category||category==='all')return [...common,'brand','model','year_min','year_max','mileage_max','fuel','transmission','body','condition','drive','color','credit','barter'];
 if(category==='parts')return [...common,'vehicle_type','brand','model','condition','part_type','oem'];
 if(category==='insurance')return [...common,'insurance_type','insurer'];
 if(category==='plates')return [...common,'plate_region','plate_letters','plate_digits'];
 return [...common,'service_type','vehicle_type'];
}
