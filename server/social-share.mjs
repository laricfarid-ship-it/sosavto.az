// Social media preview only. Never publishes or exposes account tokens.
export function socialShareEnabled(){ return process.env.SOCIAL_SHARE_ENABLED === 'true'; }
export function socialSharePreview(listing, imageUrl = '') {
 if (!listing || listing.status !== 'active') throw new Error('LISTING_NOT_ACTIVE');
 const origin = 'https://sosavto.az';
 const link = origin + '/elan?id=' + encodeURIComponent(listing.id);
 const title = String(listing.title || [listing.brand, listing.model, listing.year].filter(Boolean).join(' ')).trim();
 const price = Number(listing.price);
 const priceLabel = Number.isFinite(price) ? price.toLocaleString('az-AZ', {maximumFractionDigits: 0}) + ' AZN' : '';
 const caption = [title, priceLabel, listing.city, 'Elana bax: ' + link, '#SosAvto'].filter(Boolean).join('\n');
 return {listingId: listing.id, title, caption, link, imageUrl, platforms: ['instagram','facebook'], published: false};
}

const graphVersion='v22.0';
async function graph(path,params,token){
 const form=new URLSearchParams({...params,access_token:token});
 const response=await fetch('https://graph.facebook.com/'+graphVersion+'/'+path,{method:'POST',body:form,signal:AbortSignal.timeout(25000)});
 const data=await response.json().catch(()=>({}));
 if(!response.ok||data.error)throw new Error('Meta API: '+String(data.error?.message||response.status).slice(0,240));
 if(!data.id)return Promise.reject(new Error('Meta paylaşım identifikatoru qaytarmadı.'));
 return data.id;
}
export function socialConfigured(platform){
 return platform==='instagram'?Boolean(process.env.META_IG_USER_ID&&process.env.META_IG_ACCESS_TOKEN):platform==='facebook'?Boolean(process.env.META_FB_PAGE_ID&&process.env.META_FB_PAGE_ACCESS_TOKEN):false;
}
export async function publishSocial(platform,preview){
 if(process.env.SOCIAL_SHARE_ENABLED!=='true')throw new Error('Sosial paylaşım hələ aktivləşdirilməyib.');
 if(!socialConfigured(platform))throw new Error('Meta hesab bağlantısı tamamlanmayıb.');
 if(!preview.imageUrl||!/^https:\/\//i.test(preview.imageUrl))throw new Error('Paylaşım üçün açıq HTTPS şəkli tələb olunur.');
 if(platform==='facebook'){
  return graph(process.env.META_FB_PAGE_ID+'/photos',{url:preview.imageUrl,caption:preview.caption},process.env.META_FB_PAGE_ACCESS_TOKEN);
 }
 if(platform==='instagram'){
  const id=await graph(process.env.META_IG_USER_ID+'/media',{image_url:preview.imageUrl,caption:preview.caption},process.env.META_IG_ACCESS_TOKEN);
  return graph(process.env.META_IG_USER_ID+'/media_publish',{creation_id:id},process.env.META_IG_ACCESS_TOKEN);
 }
 throw new Error('Platforma tanınmadı.');
}
