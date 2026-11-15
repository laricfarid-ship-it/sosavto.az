// Transcode locally: no extra service or server-side video-processing charge.
export async function prepareStoryVideo(file,onProgress=()=>{}){
 if(file.size>100*1024*1024)throw Error('İlkin video maksimum 100 MB ola bilər.');
 const video=document.createElement('video'),url=URL.createObjectURL(file);
 video.src=url;video.muted=true;video.playsInline=true;video.preload='auto';
 let recorder,stream,timer,frame,audio;
 try{
 await new Promise((ok,no)=>{video.onloadedmetadata=ok;video.onerror=()=>no(Error('Video açılmadı. MP4 videosu seçin.'));});
 if(!Number.isFinite(video.duration)||video.duration<=0||video.duration>30.1)throw Error('Story videosu maksimum 30 saniyə ola bilər.');
 if(file.size<=3*1024*1024&&['video/mp4','video/webm'].includes(file.type))return file;
 if(typeof MediaRecorder==='undefined')throw Error('Bu brauzerdə sıxılma dəstəklənmir. Maksimum 3 MB video seçin.');
 const mime=['video/mp4','video/webm;codecs=vp8,opus','video/webm'].find(t=>MediaRecorder.isTypeSupported(t));
 if(!mime)throw Error('Maksimum 3 MB MP4 və ya WebM videosu seçin.');
 const canvas=document.createElement('canvas');const scale=Math.min(1,720/video.videoWidth,1280/video.videoHeight);
 canvas.width=Math.max(2,Math.floor(video.videoWidth*scale/2)*2);canvas.height=Math.max(2,Math.floor(video.videoHeight*scale/2)*2);
 const ctx=canvas.getContext('2d');stream=canvas.captureStream(24);
 // Route sound to the recording only, keeping the local preview silent.
 const AudioContext=window.AudioContext||window.webkitAudioContext;
 if(AudioContext){audio=new AudioContext();const source=audio.createMediaElementSource(video),destination=audio.createMediaStreamDestination();source.connect(destination);destination.stream.getAudioTracks().forEach(t=>stream.addTrack(t));await audio.resume();}
 recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:560000,audioBitsPerSecond:64000});
 const chunks=[];let bytes=0;
 const done=new Promise((ok,no)=>{recorder.ondataavailable=e=>{chunks.push(e.data);bytes+=e.data.size;if(bytes>3*1024*1024){no(Error('Video sıxıldıqdan sonra 3 MB həddini keçir. Daha qısa video seçin.'));recorder.stop();}};recorder.onstop=()=>ok(new Blob(chunks,{type:mime.split(';')[0]}));recorder.onerror=()=>no(Error('Video sıxılmadı. Daha kiçik MP4 videosu seçin.'));video.onended=()=>{if(recorder.state!=='inactive')recorder.stop();};video.onerror=()=>no(Error('Video oxunmadı.'));timer=setTimeout(()=>no(Error('Video hazırlama vaxtı bitdi. Yenidən cəhd edin.')),65000);});
 function draw(){ctx.drawImage(video,0,0,canvas.width,canvas.height);onProgress(Math.min(99,Math.round(video.currentTime/video.duration*100)));frame=requestAnimationFrame(draw);}
 recorder.start(500);await video.play();draw();const result=await done;
 if(result.size>3*1024*1024)throw Error('Video maksimum 3 MB olmalıdır.');return result;
 }finally{clearTimeout(timer);cancelAnimationFrame(frame);video.pause();if(recorder&&recorder.state!=='inactive')recorder.stop();stream?.getTracks().forEach(t=>t.stop());await audio?.close();video.removeAttribute('src');video.load();URL.revokeObjectURL(url);}
}
