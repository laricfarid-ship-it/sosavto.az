export const storyVideoMaxBytes=100*1024*1024;
const outputMaxBytes=3*1024*1024;

// Extensions cover video files whose operating system omits the MIME type.
export function isStoryVideo(file){
 return file.type.startsWith('video/')||/\.(mp4|m4v|mov|qt|webm|mkv|avi|3gp|3g2|mpeg|mpg|mts|m2ts|ts|wmv|flv|ogv|vob|asf|f4v|mxf|m4s|rmvb)$/i.test(file.name);
}

export async function prepareStoryVideo(file,onProgress=()=>{},signal){
 if(!file.size)throw Error('Video faylı boşdur. Başqa video seçin.');
 if(file.size>storyVideoMaxBytes)throw Error('İlkin video maksimum 100 MB ola bilər.');
 signal?.throwIfAborted();
 return new Promise((resolve,reject)=>{
  const worker=new Worker(new URL('./story-video-worker.js',import.meta.url));
  const timer=setTimeout(()=>finish(reject,Error('Videonun hazırlanması vaxtında bitmədi. Daha kiçik video seçin.')),180000);
  const abort=()=>finish(reject,signal.reason);
  function finish(callback,value){
   clearTimeout(timer);
   signal?.removeEventListener('abort',abort);
   worker.terminate();
   callback(value);
  }
  signal?.addEventListener('abort',abort,{once:true});
  worker.onmessage=({data})=>{
   if(data.type==='progress'){onProgress(data.value);return;}
   if(data.type==='error'){finish(reject,Error(data.message));return;}
   if(data.type!=='video')return;
   const blob=new Blob([data.bytes],{type:'video/mp4'});
   if(!blob.size||blob.size>outputMaxBytes){finish(reject,Error('Video hazırlandıqdan sonra 3 MB həddini keçdi.'));return;}
   finish(resolve,blob);
  };
  worker.onerror=()=>finish(reject,Error('Video hazırlayıcısı açılmadı. Səhifəni yeniləyib təkrar yoxlayın.'));
  worker.postMessage(file);
 });
}
