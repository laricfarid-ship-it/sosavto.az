// Explicit opt-in import of named OpenStreetMap automotive POIs to admin review.
// Usage: DATABASE_URL=... CONFIRM_SERVICE_IMPORT=review-only node scripts/import-service-businesses.mjs
// Never runs in Vercel builds. Imported records remain unpublished until reviewed.
import {randomUUID} from 'node:crypto';
import {query,close} from '../server/db.mjs';
if(process.env.CONFIRM_SERVICE_IMPORT!=='review-only')throw Error('Set CONFIRM_SERVICE_IMPORT=review-only to import into the review queue.');
const overpass='https://overpass-api.de/api/interpreter';
const q='[out:json][timeout:35];(nwr["name"]["shop"="car_repair"](40.25,49.65,40.62,50.20);nwr["name"]["amenity"="car_wash"](40.25,49.65,40.62,50.20);nwr["name"]["shop"="car_parts"](40.25,49.65,40.62,50.20);nwr["name"]["service:vehicle:detailing"="yes"](40.25,49.65,40.62,50.20););out center 150;';
const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),45000);
let data;try{const response=await fetch(overpass,{method:'POST',body:new URLSearchParams({data:q}),headers:{'User-Agent':'SosAvtoDirectoryPilot/1.0 (https://sosavto.az)','Content-Type':'application/x-www-form-urlencoded'},signal:controller.signal});if(!response.ok)throw Error('Overpass '+response.status);data=await response.json();}finally{clearTimeout(timer);}
let inserted=0,skipped=0;
try{
 for(const e of data.elements||[]){
  const t=e.tags||{},name=(t.name||'').trim(),lat=e.lat??e.center?.lat,lon=e.lon??e.center?.lon;
  if(!name||name.length>180||!Number.isFinite(lat)||!Number.isFinite(lon)){skipped++;continue;}
  const category=t.amenity==='car_wash'?'wash':t.shop==='car_parts'?'parts':t['service:vehicle:detailing']==='yes'?'detailing':'repair';
  const address=[t['addr:street'],t['addr:housenumber']].filter(Boolean).join(' ');
  const sourceId=e.type+'/'+e.id;
  const result=await query(`INSERT INTO service_businesses(id,name,category,city,district,address,latitude,longitude,source_name,source_id,source_url,source_license,publication_status)
   VALUES($1,$2,$3,'Bakı',$4,$5,$6,$7,'OpenStreetMap',$8,$9,'ODbL-1.0','pending_review')
   ON CONFLICT (source_name,source_id) DO NOTHING RETURNING id`,
   [randomUUID(),name,category,(t['addr:suburb']||t['addr:district']||'').slice(0,120),address.slice(0,500),lat,lon,sourceId,'https://www.openstreetmap.org/'+sourceId]);
  if(result.rows.length)inserted++;else skipped++;
 }
 console.log(JSON.stringify({inserted,skipped,status:'pending_review',note:'No businesses published automatically.'}));
}finally{await close();}
