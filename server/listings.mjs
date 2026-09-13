import {text,number,fail,uuid} from './security.mjs';
export const categories=['car','parts','service','wash','detailing','insurance'];
export function listingInput(b){
 if(!categories.includes(b.category))fail(400,'Kateqoriya seçin.');
 const phone=text(b.phone,'Telefon',9,25).replace(/[\s()-]/g,'');if(!/^(\+994|0)\d{9}$/.test(phone))fail(400,'Azərbaycan telefon nömrəsini düzgün daxil edin.');
 const v={category:b.category,title:text(b.title,'Başlıq',5,120),description:text(b.description,'Təsvir',20,5000),price:number(b.price,'Qiymət',0,999999999),city:text(b.city,'Şəhər',2,80),brand:text(b.brand||'','Marka',0,60),model:text(b.model||'','Model',0,80),year:number(b.year,'İl',1900,new Date().getFullYear()+1,true),mileage:number(b.mileage,'Yürüş',0,9999999,true),phone,address:text(b.address||'','Ünvan',0,250),latitude:number(b.latitude,'Enlik',-90,90,true),longitude:number(b.longitude,'Uzunluq',-180,180,true)};
 if((v.latitude===null)!==(v.longitude===null))fail(400,'Xəritə koordinatlarını birlikdə daxil edin.');
 if(v.category==='car'&&(!v.brand||!v.model||!Number.isInteger(v.year)||v.mileage===null||!Number.isInteger(v.mileage)))fail(400,'Avtomobil üçün marka, model, il və yürüşü doldurun.');
 const details={};for(const k of ['fuel','transmission','body','engine','color','drive','condition','hours'])details[k]=text(b.details?.[k]||'',k,0,80);
 details.credit=b.details?.credit===true;details.barter=b.details?.barter===true;v.details=JSON.stringify(details);
 if(!Array.isArray(b.imageIds)||b.imageIds.length>8||new Set(b.imageIds).size!==b.imageIds.length)fail(400,'Maksimum 8 fərqli şəkil seçin.');
 v.imageIds=b.imageIds.map(uuid);return v;
}
export const columns=['category','title','description','price','city','brand','model','year','mileage','phone','address','latitude','longitude','details'];
export const projection=`l.*, (SELECT url FROM images WHERE listing_id=l.id ORDER BY sort_order LIMIT 1) AS image,
 (SELECT count(*)::integer FROM favorites WHERE listing_id=l.id) AS favorite_count`;
export function search(params){
 const where=["l.status='active'"],args=[];const add=(sql,v)=>{args.push(v);where.push(sql.replace('?',`$${args.length}`));};
 for(const k of ['category','city','brand','model'])if(params.get(k))add(`l.${k}=?`,text(params.get(k),k,1,80));
 if(params.get('q')){add("(l.title ILIKE ? OR l.description ILIKE ?)",`%${text(params.get('q'),'Axtarış',1,160)}%`);where[where.length-1]=where.at(-1).replace('?',`$${args.length}`);}
 for(const [k,col,op]of [['year_min','year','>='],['year_max','year','<='],['price_min','price','>='],['price_max','price','<='],['mileage_max','mileage','<=']])if(params.get(k))add(`l.${col}${op}?`,number(params.get(k),k,0,999999999));
 for(const k of ['fuel','transmission','body','condition','drive','color'])if(params.get(k))add(`l.details->>'${k}'=?`,text(params.get(k),k,1,80));
 for(const k of ['credit','barter'])if(params.get(k)==='true')where.push(`l.details->>'${k}'='true'`);
 const orders={newest:'l.created_at DESC',price_asc:'l.price ASC,l.created_at DESC',price_desc:'l.price DESC,l.created_at DESC'};
 return {where:where.join(' AND '),args,order:orders[params.get('sort')]||orders.newest,page:Math.max(1,Math.min(10000,Number(params.get('page'))||1))};
}
