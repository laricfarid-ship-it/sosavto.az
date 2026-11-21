self.onmessage=async({data:file})=>{
 let core;
 try{
  importScripts('./ffmpeg-core.js');
  const wasmURL=new URL('./ffmpeg-core.wasm',self.location.href).href;
  core=await self.createFFmpegCore({mainScriptUrlOrBlob:new URL('./ffmpeg-core.js',self.location.href).href+'#'+btoa(JSON.stringify({wasmURL}))});
 }catch{
  self.postMessage({type:'error',message:'Video hazırlayıcısı yüklənmədi. İnternet bağlantısını yoxlayıb yenidən cəhd edin.'});
  return;
 }
 try{
  core.FS.writeFile('input',new Uint8Array(await file.arrayBuffer()));
  core.setProgress(({time})=>self.postMessage({type:'progress',value:Math.max(0,Math.min(99,Math.floor(time/300000)))}));
  const code=core.exec(
   '-i','input','-map','0:V:0','-map','0:a:0?','-t','30',
   '-vf','scale=720:1280:force_original_aspect_ratio=decrease:force_divisible_by=2,fps=24',
   '-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p','-b:v','560k','-maxrate','640k','-bufsize','640k',
   '-c:a','aac','-b:a','64k','-ac','2','-movflags','+faststart','story.mp4'
  );
  if(code!==0)throw Error('Video conversion failed');
  const bytes=core.FS.readFile('story.mp4');
  if(!bytes.length)throw Error('Empty video');
  self.postMessage({type:'video',bytes},[bytes.buffer]);
 }catch{
  self.postMessage({type:'error',message:'Video oxunmadı. Fayl zədələnmiş ola bilər və ya video formatı dəstəklənmir.'});
 }
};
