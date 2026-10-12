import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {readFile} from 'node:fs/promises';
process.env.LOCAL_DATABASE='true';process.env.LOCAL_DB_PATH='memory://';process.env.APP_ORIGIN='http://localhost:4173';delete process.env.DATABASE_URL;delete process.env.SOS_ENABLED;delete process.env.WASH_ENABLED;
const {database,query,close}=await import('../server/db.mjs');
const {default:handler}=await import('../api/index.mjs');
const seo=await import('../server/seo.mjs');

async function get(path,method='GET'){
 const req=Readable.from([]);req.method=method;req.url=path;req.headers={};
 const headers={};let body='';const res={statusCode:200,setHeader:(k,v)=>headers[k.toLowerCase()]=v,end:v=>body=v??''};
 await handler(req,res);return {status:res.statusCode,headers,body};
}
const ids={active:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',pending:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',sold:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',deleted:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',hostile:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',missing:'ffffffff-ffff-4fff-8fff-ffffffffffff'};
const user='11111111-1111-4111-8111-111111111111',phone='+994501234567',address='Nizami küçəsi 10, gizli ünvan';
async function insert(id,{title,status='active',details={},price=23000}){
 await query('INSERT INTO listings(id,user_id,category,title,description,price,city,brand,model,year,mileage,phone,address,details,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)',[id,user,'car',title,'Test avtomobil haqqında kifayət qədər ətraflı təsvir. Təmiz vəziyyətdədir.',price,'Bakı','Hyundai','Elantra',2018,85000,phone,address,JSON.stringify(details),status]);
}
before(async()=>{
 await (await database()).exec(await readFile(new URL('../server/schema.sql',import.meta.url),'utf8'));
 await query("INSERT INTO users(id,fullname,username,email,password_hash) VALUES($1,'Test','seo_owner','seo@example.test','x')",[user]);
 await insert(ids.active,{title:'Hyundai Elantra 2018 "təmiz" & <b>sərfəli</b>'});
 await insert(ids.pending,{title:'Gözləyən elan',status:'pending'});
 await insert(ids.sold,{title:'Satılmış elan',status:'sold'});
 await insert(ids.deleted,{title:'Silinmiş elan',details:{_deleted:true}});
 await insert(ids.hostile,{title:'</script><script>alert(1)</script>',price:0});
 await query('INSERT INTO images(id,user_id,listing_id,url,sort_order) VALUES($1,$2,$3,$4,0)',['99999999-9999-4999-8999-999999999999',user,ids.active,'/media/99999999-9999-4999-8999-999999999999.webp']);
});
after(async()=>{await close();});

test('sitemap lists only active, non-deleted listings and public pages',async()=>{
 const r=await get('/sitemap.xml');
 assert.equal(r.status,200);assert.match(r.headers['content-type'],/^application\/xml/);assert.match(r.headers['cache-control'],/s-maxage=3600/);
 assert.ok(r.body.startsWith('<?xml'));
 assert.match(r.body,new RegExp(`<loc>http://localhost:4173/elan\\?id=${ids.active}</loc><lastmod>\\d{4}-\\d\\d-\\d\\dT`));
 assert.ok(r.body.includes('<loc>http://localhost:4173/</loc>')&&r.body.includes('/kredit.html'));
 for(const k of ['pending','sold','deleted'])assert.ok(!r.body.includes(ids[k]),k);
 assert.ok(!r.body.includes('/avtoyuma.html')&&!r.body.includes('/sos.html'),'disabled modules stay out of the sitemap');
});

test('active listing page has server-rendered, escaped metadata and no private data',async()=>{
 const r=await get('/elan?id='+ids.active);
 assert.equal(r.status,200);assert.match(r.headers['content-type'],/^text\/html/);assert.match(r.headers['cache-control'],/s-maxage=300/);
 assert.ok(r.body.includes('<title>Hyundai Elantra 2018 &quot;təmiz&quot; &amp; &lt;b&gt;sərfəli&lt;/b&gt; — SosAvto.az</title>'));
 assert.ok(!r.body.includes('<b>'));
 assert.ok(r.body.includes(`<link rel="canonical" href="http://localhost:4173/elan?id=${ids.active}">`));
 assert.ok(r.body.includes('<meta property="og:image" content="http://localhost:4173/media/99999999-9999-4999-8999-999999999999.webp">'));
 assert.match(r.body,/<meta name="description" content="23 000 ₼ · Bakı\. Test avtomobil/);
 assert.ok(!r.body.includes('noindex'));
 assert.ok(!r.body.includes(phone)&&!r.body.includes('gizli ünvan')&&!r.body.includes('994501234567'));
 const ld=JSON.parse(r.body.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
 assert.equal(ld['@type'],'Product');assert.equal(ld.offers.price,'23000');assert.equal(ld.offers.priceCurrency,'AZN');assert.equal(ld.brand.name,'Hyundai');assert.deepEqual(ld.image,['http://localhost:4173/media/99999999-9999-4999-8999-999999999999.webp']);
 assert.ok(r.body.includes('<script type="module" src="assets/app.js">')&&r.body.includes('<main id="main"'));
});

test('listing text cannot break out of the page or the structured data',async()=>{
 const r=await get('/elan?id='+ids.hostile);
 assert.equal(r.status,200);
 assert.ok(!r.body.includes('<script>alert(1)'),'no executable injected script');
 assert.ok(!r.body.includes('</script><script>'));
 const ld=JSON.parse(r.body.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
 assert.equal(ld.name,'</script><script>alert(1)</script>');assert.ok(!('offers'in ld),'no offer for a zero price');
});

test('inactive, deleted, unknown and malformed ids are never indexable',async()=>{
 for(const k of ['pending','sold']){const r=await get('/elan?id='+ids[k]);assert.equal(r.status,200);assert.ok(r.body.includes('<meta name="robots" content="noindex">'),k);assert.equal(r.headers['x-robots-tag'],'noindex');assert.equal(r.headers['cache-control'],'no-store');assert.ok(!r.body.includes('Gözləyən')&&!r.body.includes('Satılmış')&&!r.body.includes('canonical'));}
 for(const q of ['?id='+ids.deleted,'?id='+ids.missing,'?id=not-a-uuid','','?id=\' OR 1=1 --']){const r=await get('/elan'+q);assert.equal(r.status,404,q);assert.ok(r.body.includes('noindex'));assert.equal(r.headers['x-robots-tag'],'noindex');assert.ok(r.body.includes('<main id="main"'),'client app still shows its own not-found message');}
 assert.equal((await get('/elan?id='+ids.active,'POST')).status,404,'only GET/HEAD are served as pages');
});

test('the server-rendered shell matches elan.html so the client app behaves the same',async()=>{
 const file=await readFile(new URL('../elan.html',import.meta.url),'utf8');
 const tail=s=>s.slice(s.indexOf('<link rel="icon"'));
 assert.equal(tail(seo.shell('')).trim(),tail(file).trim());
 assert.ok(seo.shell(seo.listingHead({id:ids.active,title:'T',description:'D',price:0,city:'',brand:'',image:''},'https://x.test')).includes('<meta name="description"'),'app.js needs the description tag');
});

test('canonical origin only trusts https or localhost configuration',()=>{
 assert.equal(seo.siteOrigin({APP_ORIGIN:'https://sosavto.az'}),'https://sosavto.az');
 assert.equal(seo.siteOrigin({APP_ORIGIN:'http://localhost:4173'}),'http://localhost:4173');
 for(const v of [undefined,'','not a url','http://evil.example','javascript:alert(1)'])assert.equal(seo.siteOrigin({APP_ORIGIN:v}),'https://sosavto-az.vercel.app');
});

test('sitemap builder skips malformed ids and escapes values',()=>{
 const xml=seo.sitemapXml([{id:ids.active,updated_at:'2026-10-12T08:00:00Z'},{id:'<bad>&',updated_at:null},{id:ids.sold,updated_at:'garbage'}],'https://x.test',{wash:true,sos:true});
 assert.ok(xml.includes('/avtoyuma.html')&&xml.includes('/sos.html'));
 assert.ok(!xml.includes('<bad>'));
 assert.ok(xml.includes('<lastmod>2026-10-12T08:00:00.000Z</lastmod>'));
 assert.ok(xml.includes(`<loc>https://x.test/elan?id=${ids.sold}</loc></url>`),'invalid dates omit lastmod');
});
