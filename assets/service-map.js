export const mapKinds={service:{color:'#7158c9',symbol:'🔧'},wash:{color:'#087ea4',symbol:'💧'},detailing:{color:'#a66008',symbol:'✨'},parts:{color:'#25814b',symbol:'⚙'}};
// Exact coordinates and owner keep unrelated businesses separate.
export function groupMapListings(listings){
 const places=new Map();
 for(const l of listings){
  if(!mapKinds[l.category]||l.latitude==null||l.longitude==null)continue;
  const latitude=Number(l.latitude),longitude=Number(l.longitude);
  if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)continue;
  const key=JSON.stringify([l.user_id||l.id,latitude,longitude,String(l.address||'').trim().toLocaleLowerCase('az')]);
  if(!places.has(key))places.set(key,{latitude,longitude,listings:[]});
  places.get(key).listings.push(l);
 }
 return [...places.values()];
}
