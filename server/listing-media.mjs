import {fail,uuid} from './security.mjs';
export const SPIN_OFFSET=100;
export function spinSelection(body,category){
 if(body.spinImageIds===undefined)return undefined;
 if(!Array.isArray(body.spinImageIds))fail(400,'360° şəkil siyahısı düzgün deyil.');
 const ids=body.spinImageIds;
 if(ids.length&&(category!=='car'||ids.length<24||ids.length>36||new Set(ids).size!==ids.length))fail(400,'360° üçün yalnız avtomobil elanında 24–36 fərqli kadr seçin.');
 return ids.map(uuid);
}
export async function imagesFor(c,user,id,ids,spinIds,category){
 if(spinIds===undefined)spinIds=category==='car'?(await c.query('SELECT id FROM images WHERE listing_id=$1 AND sort_order>=100 ORDER BY sort_order,id',[id])).rows.map(r=>r.id):[];
 const all=[...ids,...spinIds];
 if(new Set(all).size!==all.length)fail(400,'Adi şəkillər və 360° kadrları ayrı olmalıdır.');
 if(all.length){
  const r=await c.query('SELECT id,sort_order FROM images WHERE id=ANY($1::uuid[]) AND user_id=$2 AND (listing_id IS NULL OR listing_id=$3) ORDER BY id FOR UPDATE',[all,user.id,id]);
  if(r.rows.length!==all.length)fail(400,'Şəkil seçimi düzgün deyil.');
  const types=new Map(r.rows.map(p=>[p.id,p.sort_order>=SPIN_OFFSET]));
  if(ids.some(p=>types.get(p))||spinIds.some(p=>!types.get(p)))fail(400,'360° kadrlarını ayrıca 360° bölməsindən yükləyin.');
 }
 await c.query('UPDATE images SET listing_id=NULL WHERE listing_id=$1',[id]);
 for(let i=0;i<ids.length;i++)await c.query('UPDATE images SET listing_id=$1,sort_order=$2 WHERE id=$3',[id,i,ids[i]]);
 for(let i=0;i<spinIds.length;i++)await c.query('UPDATE images SET listing_id=$1,sort_order=$2 WHERE id=$3',[id,SPIN_OFFSET+i,spinIds[i]]);
}
