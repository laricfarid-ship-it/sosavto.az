import {query} from './db.mjs';
import {esc,siteOrigin} from './seo.mjs';
import {dealershipShell} from './dealership-shell.mjs';
export async function dealershipSeo(req,res,url){
 const slug=url.searchParams.get('slug')||'',origin=siteOrigin();let profile=null;
 if(slug&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))profile=(await query("SELECT p.slug,p.display_name,p.description,p.logo_url,p.banner_url FROM dealership_profiles p JOIN users u ON u.id=p.owner_user_id WHERE p.slug=$1 AND p.status='approved' AND u.status='active'",[slug])).rows[0];
 const missing=Boolean(slug&&!profile),title=missing?'Salon tapılmadı':profile?profile.display_name:'Avtosalonlar';
 const description=missing?'Salon mövcud deyil və ya istifadəyə açılmayıb.':profile?(profile.description||profile.display_name+' avtosalonunun avtomobilləri.').slice(0,160):'Təsdiqlənmiş avtosalonları və avtomobillərini bir yerdə kəşf edin.';
 const canonical=origin+'/salon.html'+(profile?'?slug='+profile.slug:'');
 const image=profile?.banner_url||profile?.logo_url||'';
 const head='<title>'+esc(title)+' — SosAvto.az</title><meta name="description" content="'+esc(description)+'">'+(missing?'<meta name="robots" content="noindex">':'<link rel="canonical" href="'+esc(canonical)+'"><meta property="og:type" content="website"><meta property="og:site_name" content="SosAvto.az"><meta property="og:title" content="'+esc(title)+' — SosAvto.az"><meta property="og:description" content="'+esc(description)+'"><meta property="og:url" content="'+esc(canonical)+'">'+(/^https:\/\//.test(image)?'<meta property="og:image" content="'+esc(image)+'"><meta name="twitter:card" content="summary_large_image">':''));
 res.statusCode=missing?404:200;res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control','no-store');if(missing)res.setHeader('X-Robots-Tag','noindex');res.end(dealershipShell.replace(/<title>.*?<\/title><meta name="description" content="[^"]*">/,head));
}
