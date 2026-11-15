// Keep JSON uploads comfortably below both the API and platform body limits.
export async function prepareUpload(file){
 if(!file||!file.size)throw Error('Şəkil faylı boşdur.');
 if(file.size>25*1024*1024)throw Error('Şəkil 25 MB-dan böyükdür. Daha kiçik şəkil seçin.');
 const type=(file.type||'').toLowerCase();
 if(!/^image\/(jpeg|png|webp)$/.test(type)&&!(/\.(jpe?g|png|webp)$/i.test(file.name||'')&&!type))throw Error('JPEG, PNG və ya WebP şəkli seçin. HEIC şəklini əvvəlcə JPEG kimi saxlayın.');
 const url=URL.createObjectURL(file);
 try{
  const img=await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('Şəkil oxunmadı. Başqa şəkil seçin.'));image.src=url;});
  if(!img.naturalWidth||!img.naturalHeight)throw Error('Şəkil oxunmadı.');
  const scale=Math.min(1,1600/img.naturalWidth,1200/img.naturalHeight);
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
  const context=canvas.getContext('2d');if(!context)throw Error('Şəkli hazırlamaq mümkün olmadı. Səhifəni yeniləyib təkrar sınayın.');
  context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(img,0,0,canvas.width,canvas.height);
  for(const quality of [.9,.8,.65,.5]){const data=canvas.toDataURL('image/jpeg',quality);if(data.startsWith('data:image/jpeg;base64,')&&data.length<=2800000)return data;}
  throw Error('Şəkli kiçiltmək mümkün olmadı. Başqa şəkil seçin.');
 }finally{URL.revokeObjectURL(url);}
}
