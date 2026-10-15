import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as legal from '../assets/legal.js';

const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const keys=Object.keys(legal.legalPages);

test('four legal pages exist with their own HTML shell, title and the app script',async()=>{
 assert.deepEqual(keys.sort(),['elaqe.html','haqqinda.html','mexfiyyet.html','qaydalar.html']);
 for(const k of keys){
  const html=await read(k),p=legal.legalPages[k];
  assert.ok(html.includes('lang="az"')&&html.includes('assets/app.js'),k);
  assert.ok(html.includes(`<title>${p.title} — SosAvto.az</title>`),k+' title');
  assert.ok(html.includes(`content="${p.description}"`),k+' description');
 }
});

test('every page renders a heading and real content; unknown pages return null',()=>{
 for(const k of keys){
  const r=legal.legalPage(k);
  assert.match(r.html,/^<article class="legal"><h1>[^<]+<\/h1>/);
  assert.ok(r.html.length>400,k);
  assert.ok(!/undefined|null|\[object/.test(r.html),k);
 }
 assert.equal(legal.legalPage('elan.html'),null);
 assert.equal(legal.legalPage('__proto__'),null);
});

test('contact block shows only valid, escaped contact details',()=>{
 assert.match(legal.contactHtml({email:'',phone:''}),/tezliklə əlavə olunacaq/);
 const ok=legal.contactHtml({email:'info@example.test',phone:'+994 50 123 45 67'});
 assert.ok(ok.includes('href="mailto:info@example.test"')&&ok.includes('href="tel:+994501234567"')&&ok.includes('+994 50 123 45 67'));
 for(const bad of ['"><script>alert(1)</script>@x.az','a b@x.az','<b>@x.az','x@y'])assert.match(legal.contactHtml({email:bad,phone:''}),/tezliklə əlavə olunacaq/,bad);
 assert.ok(!legal.contactHtml({email:'',phone:'<img src=x>123456789'}).includes('<img'));
});

test('contact and privacy pages use the configured contact',()=>{
 const before={...legal.contact};
 try{
  legal.contact.email='salam@example.test';
  for(const k of ['elaqe.html','mexfiyyet.html'])assert.ok(legal.legalPage(k).html.includes('mailto:salam@example.test'),k);
 }finally{Object.assign(legal.contact,before);}
});

test('privacy policy names what the code really does',()=>{
 const html=legal.legalPage('mexfiyyet.html').html;
 for(const needle of ['sosavto_session','Vercel','Resend','Google Gemini','OpenStreetMap','bcrypt','EXIF','SOS','Avtoyuma','sessionStorage'])assert.ok(html.includes(needle),needle);
 assert.ok(!/analitika (xidməti )?istifadə edirik/.test(html),'must not claim analytics that do not exist');
});

test('terms point to emergency number and say sales and payment happen outside the site',()=>{
 const html=legal.legalPage('qaydalar.html').html;
 assert.ok(html.includes('<strong>112</strong>'));
 assert.ok(html.includes('sayt üzərindən aparılmır')||html.includes('sayt üzərindən həyata keçirilmir'));
 assert.ok(html.includes('kartla ödəniş aktiv deyil'));
});

test('footer links to all legal pages and the sitemap lists them',async()=>{
 const app=await read('assets/app.js'),seo=await read('server/seo.mjs');
 for(const [file,label] of legal.legalLinks){
  assert.ok(app.includes(`<a href="${file}">${label}</a>`),'footer '+file);
  assert.ok(seo.includes(`'/${file}'`),'sitemap '+file);
  assert.ok(app.includes(`'${file}':()=>legalRoute()`),'route '+file);
 }
});
