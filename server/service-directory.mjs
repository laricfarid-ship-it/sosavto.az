import {query} from './db.mjs';
import {fail,requireAdmin} from './security.mjs';

const categories=new Set(['wash','detailing','repair','parts','tyres','electrical','bodywork','roadside']);
const statuses=new Set(['published','pending_review','draft','suspended']);
const integer=(value,fallback,max)=>{const n=Number(value);return Number.isInteger(n)&&n>=1?Math.min(n,max):fallback;};
export async function serviceDirectory(req,user,path,method,url){
 if(path==='/api/service-businesses'&&method==='GET'){
  const p=url.searchParams,filters=["publication_status='published'"],args=[];
  for(const [field,key] of [['city','city'],['district','district'],['category','category']]){
   const value=(p.get(key)||'').trim();
   if(value){if(value.length>120)fail(400,'Filtr çox uzundur.');if(key==='category'&&!categories.has(value))fail(400,'Kateqoriya düzgün deyil.');args.push(value);filters.push(field+'=$'+args.length);}
  }
  const q=(p.get('q')||'').trim();if(q){if(q.length>100)fail(400,'Axtarış çox uzundur.');args.push('%'+q.replace(/[\\%_]/g,'\\$&')+'%');filters.push("(name ILIKE $"+args.length+" ESCAPE '\\' OR address ILIKE $"+args.length+" ESCAPE '\\')");}
  const page=integer(p.get('page'),1,10000),limit=integer(p.get('limit'),24,100);
  const where=filters.join(' AND ');
  const total=(await query('SELECT count(*)::integer AS total FROM service_businesses WHERE '+where,args)).rows[0].total;
  const rows=(await query('SELECT id,name,category,city,district,address,latitude,longitude,phone,website,source_name,source_url,source_license,ownership_status,verified_at FROM service_businesses WHERE '+where+' ORDER BY name,id LIMIT $'+(args.length+1)+' OFFSET $'+(args.length+2),[...args,limit,(page-1)*limit])).rows;
  return {businesses:rows,total,page,pages:Math.ceil(total/limit)};
 }
 if(path==='/api/admin/service-businesses'&&method==='GET'){
  requireAdmin(user);const status=url.searchParams.get('status')||'pending_review';
  if(!statuses.has(status))fail(400,'Status düzgün deyil.');
  const rows=(await query('SELECT * FROM service_businesses WHERE publication_status=$1 ORDER BY created_at DESC LIMIT 100',[status])).rows;
  return {businesses:rows};
 }
 return null;
}
