import {query} from './db.mjs';
import {washEnabled} from './wash-config.mjs';

// Public listing pages and the sitemap are rendered here so that search engines and
// link previews (WhatsApp, Telegram, Facebook) see real titles, descriptions and images
// without running JavaScript. Private data (phone, address, coordinates) is never read.

const FALLBACK_ORIGIN='https://sosavto.az';
const SITEMAP_LIMIT=5000;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

export function siteOrigin(env=process.env){
 try{const u=new URL(env.APP_ORIGIN||'');if(u.protocol==='https:'||u.hostname==='localhost')return u.origin;}catch{}
 return FALLBACK_ORIGIN;
}
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clip=(s,n)=>{const t=String(s??'').replace(/\s+/g,' ').trim();return t.length>n?t.slice(0,n-1).trimEnd()+'…':t;};
const priceText=p=>{const n=Number(p);return Number.isFinite(n)&&n>0?`${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g,' ')} ₼`:'';};
const absolute=(u,origin)=>{const v=String(u||'');if(v.startsWith('https://'))return v;if(v.startsWith('/')&&!v.startsWith('//'))return origin+v;return '';};

const headTags=(title,description,extra='')=>`<title>${esc(title)}</title><meta name="description" content="${esc(description)}">${extra}`;
const noindexHead=(title,description)=>headTags(title,description,'<meta name="robots" content="noindex">');

// Must stay identical to the body of elan.html; tests/seo.test.mjs checks that.
export function shell(head){
 return `<!doctype html>
<html lang="az"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${head}<meta name="theme-color" content="#060a10"><link rel="icon" href="assets/favicon.svg?v=sa1" type="image/svg+xml"><script src="assets/theme.js"></script><link rel="stylesheet" href="assets/style.css"><script type="module" src="assets/app.js"></script></head><body><a class="skip" href="#main">Məzmuna keç</a><header id="header" class="topbar"></header><main id="main" class="container page"><div class="loading" role="status">SosAvto yüklənir…</div></main><footer id="footer" class="footer"></footer><dialog id="dialog" aria-label="Əməliyyatın təsdiqi"></dialog><div id="toast" role="status" aria-live="polite"></div><noscript>Saytdan istifadə etmək üçün JavaScript-i aktivləşdirin.</noscript></body></html>
`;
}

export function listingHead(l,origin){
 const url=`${origin}/elan?id=${l.id}`;
 const title=`${clip(l.title,90)} — SosAvto.az`;
 const price=priceText(l.price);
 const lead=[price,l.city].filter(Boolean).join(' · ');
 const description=clip((lead?lead+'. ':'')+l.description,160);
 const image=absolute(l.image,origin);
 const tags=[
  `<link rel="canonical" href="${esc(url)}">`,
  '<meta property="og:type" content="website"><meta property="og:site_name" content="SosAvto.az"><meta property="og:locale" content="az_AZ">',
  `<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(url)}">`,
  image?`<meta property="og:image" content="${esc(image)}"><meta name="twitter:card" content="summary_large_image">`:'<meta name="twitter:card" content="summary">'
 ];
 const ld={'@context':'https://schema.org','@type':'Product',name:clip(l.title,120),description:clip(l.description,500),url};
 if(image)ld.image=[image];
 if(l.brand)ld.brand={'@type':'Brand',name:String(l.brand)};
 if(Number(l.price)>0)ld.offers={'@type':'Offer',url,price:String(Number(l.price)),priceCurrency:'AZN',availability:'https://schema.org/InStock'};
 tags.push(`<script type="application/ld+json">${JSON.stringify(ld).replace(/</g,'\\u003c')}</script>`);
 return headTags(title,description,tags.join(''));
}

export function sitemapXml(rows,origin,{wash=false,sos=false}={}){
 const pages=['/','/xarita.html','/kredit.html','/haqqinda.html','/elaqe.html','/qaydalar.html','/mexfiyyet.html',...(wash?['/avtoyuma.html']:[]),...(sos?['/sos.html']:[])];
 const urls=pages.map(p=>`<url><loc>${esc(origin+p)}</loc></url>`);
 for(const r of rows){
  if(!UUID.test(String(r.id)))continue;
  const d=r.updated_at?new Date(r.updated_at):null;
  urls.push(`<url><loc>${esc(`${origin}/elan?id=${r.id}`)}</loc>${d&&!Number.isNaN(d.getTime())?`<lastmod>${d.toISOString()}</lastmod>`:''}</url>`);
 }
 return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>\n`;
}

const send=(res,status,type,cache,body,extra={})=>{
 res.statusCode=status;res.setHeader('Content-Type',type);res.setHeader('Cache-Control',cache);
 for(const [k,v]of Object.entries(extra))res.setHeader(k,v);
 res.end(body);
};
const PUBLIC_CACHE='public, max-age=0, s-maxage=300, stale-while-revalidate=600';

export async function seoPage(req,res,path,url){
 const origin=siteOrigin();
 if(path==='/sitemap.xml'){
  const rows=(await query(`SELECT l.id,l.updated_at FROM listings l WHERE l.status='active' AND NOT (l.details @> '{"_deleted":true}'::jsonb) ORDER BY l.updated_at DESC LIMIT ${SITEMAP_LIMIT}`)).rows;
  return send(res,200,'application/xml; charset=utf-8','public, max-age=0, s-maxage=3600, stale-while-revalidate=7200',sitemapXml(rows,origin,{wash:washEnabled(),sos:process.env.SOS_ENABLED==='true'}));
 }
 // /elan?id=<uuid>: same client app as elan.html, with server-rendered metadata.
 const id=url.searchParams.get('id')||'';
 const generic='SosAvto.az — Azərbaycanda avtomobil, ehtiyat hissələri, usta, servis və avtoyuma elanları.';
 const hidden={'X-Robots-Tag':'noindex'};
 if(!UUID.test(id))return send(res,404,'text/html; charset=utf-8','no-store',shell(noindexHead('Elan tapılmadı — SosAvto.az',generic)),hidden);
 let row;
 try{
  row=(await query(`SELECT l.id,l.title,l.description,l.price,l.city,l.brand,l.status,l.details,(SELECT url FROM images WHERE listing_id=l.id ORDER BY sort_order LIMIT 1) AS image FROM listings l WHERE l.id=$1`,[id])).rows[0];
 }catch{
  // The page still works for people: the client app loads the listing through the API itself.
  return send(res,200,'text/html; charset=utf-8','no-store',shell(headTags('Elan — SosAvto.az',generic)));
 }
 if(!row||row.details?._deleted)return send(res,404,'text/html; charset=utf-8','no-store',shell(noindexHead('Elan tapılmadı — SosAvto.az',generic)),hidden);
 if(row.status!=='active')return send(res,200,'text/html; charset=utf-8','no-store',shell(noindexHead('Elan — SosAvto.az',generic)),hidden);
 return send(res,200,'text/html; charset=utf-8',PUBLIC_CACHE,shell(listingHead(row,origin)));
}
