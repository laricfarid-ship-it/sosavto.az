import {fail,rateLimit} from './security.mjs';

const cache=new Map();
export function normalizeVin(input){
 if(typeof input!=='string')fail(400,'VIN kodunu yazın.');
 const vin=input.trim().toUpperCase();
 if(!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin))fail(400,'VIN 17 hərf və rəqəmdən ibarət olmalıdır. I, O və Q istifadə edilmir.');
 return vin;
}
export async function decodeVin(input){
 const vin=normalizeVin(input),saved=cache.get(vin);
 if(saved&&saved.expires>Date.now())return saved.data;
 // Database-backed caps apply across serverless instances, including anonymous use.
 await rateLimit('vin:minute',60,60);
 await rateLimit('vin:day',1000,86400);
 let response,data;
 try{
  response=await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`,{signal:AbortSignal.timeout(12000),redirect:'error',headers:{Accept:'application/json'}});
  if(!response.ok)throw new Error('Provider unavailable');
  data=await response.json();
 }catch{fail(502,'VIN mənbəyi hazırda cavab vermir. Bir qədər sonra yenidən sınayın.');}
 const row=data?.Results?.[0];
 if(!row||typeof row!=='object')fail(502,'VIN mənbəyindən düzgün cavab alınmadı.');
 const keys={Make:'Marka',Model:'Model',ModelYear:'Model ili',Manufacturer:'İstehsalçı',PlantCountry:'İstehsal ölkəsi',PlantCity:'Zavod şəhəri',BodyClass:'Kuzov növü',VehicleType:'Nəqliyyat növü',FuelTypePrimary:'Yanacaq',DisplacementL:'Mühərrik həcmi (litr)',EngineCylinders:'Silindr sayı',DriveType:'Ötürücü'};
 const fields=Object.entries(keys).flatMap(([key,label])=>typeof row[key]==='string'&&row[key].trim()&&row[key]!=='Not Applicable'?[{key,label,value:row[key].trim().slice(0,250)}]:[]);
 const meaningful=!!(row.Make||row.Model||row.Manufacturer);
 const result={vin,source:'NHTSA vPIC',sourceUrl:'https://vpic.nhtsa.dot.gov/',status:meaningful?(String(row.ErrorCode||'')==='0'?'decoded':'partial'):'not_found',fields:meaningful?fields:[],historyAvailable:false};
 if(cache.size>=100)cache.delete(cache.keys().next().value);
 cache.set(vin,{expires:Date.now()+3600000,data:result});return result;
}
