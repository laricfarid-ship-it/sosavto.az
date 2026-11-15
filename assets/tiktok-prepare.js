// Preparation only: this flow never calls TikTok publishing APIs or marks a post sent.
export function mountTikTokPreparation(host,preview){
 const note=document.createElement('p');note.className='social-warning';note.textContent='TikTok üçün hazırlıqdır. Bu düymələr paylaşım etmir; son paylaşımı TikTok-da özünüz tamamlayırsınız.';host.append(note);
 const label=document.createElement('label');label.textContent='TikTok paylaşım mətni (redaktə edə bilərsiniz)';
 const text=document.createElement('textarea');text.rows=6;text.maxLength=2200;text.value=preview.caption||'';text.className='social-tiktok-caption';label.append(text);host.append(label);
 const result=document.createElement('p');result.setAttribute('role','status');
 const copy=document.createElement('button');copy.type='button';copy.className='social-send';copy.textContent='Mətni kopyala';
 copy.onclick=async()=>{try{await navigator.clipboard.writeText(text.value);result.textContent='Mətn kopyalandı. TikTok-da paylaşım mətninə yapışdırın.';}catch{text.focus();text.select();result.textContent='Avtomatik kopyalanmadı. Seçilmiş mətni əl ilə kopyalayın.';}};host.append(copy);
 const images=Array.isArray(preview.images)&&preview.images.length?preview.images:[preview.imageUrl];
 let available=0;
 for(const [index,url]of images.slice(0,8).entries())try{const image=new URL(url,location.origin);if(url&&image.protocol==='https:'){
  const open=document.createElement('a');open.className='social-send social-open-post';open.href=image.href;open.target='_blank';open.rel='noopener noreferrer';open.textContent=`Şəkil ${index+1} — aç və saxla`;host.append(open);available++;
 }}catch{}
 if(!available){const missing=document.createElement('p');missing.textContent='Bu elanda şəkil yoxdur. Paylaşmazdan əvvəl elana şəkil əlavə edin.';host.append(missing);}

 const steps=document.createElement('p');steps.textContent='1. Şəkli açıb cihazınıza saxlayın. 2. Mətni kopyalayın. 3. TikTok tətbiqində + → şəkilləri seçin, mətni yapışdırın və paylaşın. Kompüterdə şəkil yükləmə görünmürsə, telefon tətbiqindən istifadə edin. Elanın linki paylaşım mətninə daxildir; onun kliklənməsi TikTok imkanlarından asılıdır.';host.append(steps);
 const openTikTok=document.createElement('a');openTikTok.className='social-send social-open-post';openTikTok.href='https://www.tiktok.com/';openTikTok.target='_blank';openTikTok.rel='noopener noreferrer';openTikTok.textContent='TikTok-u aç';host.append(openTikTok,result);
}
