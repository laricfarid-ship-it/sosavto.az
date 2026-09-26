export const washServices={exterior:'Xarici yuma',interior:'Daxili yuma',foam:'Köpük / nano-şampun',drying:'Qurutma / qulluq vasitəsi',vacuum:'Salonun tozsoruculanması'};
export const vehicleSizes={standard:'Kiçik / orta avtomobil',suv:'Cip / SUV'};
export function distanceKm(a,b){const r=x=>x*Math.PI/180,dlat=r(b[0]-a[0]),dlon=r(b[1]-a[1]);return 6371*2*Math.asin(Math.sqrt(Math.min(1,Math.sin(dlat/2)**2+Math.cos(r(a[0]))*Math.cos(r(b[0]))*Math.sin(dlon/2)**2)));}
export function pointInZone(lat,lng,ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [x,y]=ring[i],[px,py]=ring[j];if((y>lat)!==(py>lat)&&lng<(px-x)*(lat-y)/(py-y)+x)inside=!inside;}return inside;}
export const wazeLinks=(lat,lng)=>({app:`waze://?ll=${encodeURIComponent(lat+','+lng)}&navigate=yes`,web:`https://www.waze.com/ul?ll=${encodeURIComponent(lat+','+lng)}&navigate=yes`});
export const washMoney=cents=>(cents/100).toFixed(2)+' ₼';
export const bakuTime=iso=>new Intl.DateTimeFormat('az-AZ',{timeZone:'Asia/Baku',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(iso));
