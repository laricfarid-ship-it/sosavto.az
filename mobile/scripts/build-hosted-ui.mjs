import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
export async function buildHostedUI(output='public/assets'){
 const css=await readFile(new URL('../ui/app.css',import.meta.url),'utf8');
 const js=await readFile(new URL('../ui/app.js',import.meta.url),'utf8');
 const updates=await readFile(new URL('../ui/updates.js',import.meta.url),'utf8');
 const version=process.env.VERCEL_GIT_COMMIT_SHA || createHash('sha256').update(css+js+updates+await readFile(new URL('../../assets/app.js',import.meta.url),'utf8')).digest('hex');
 const bundle=`(()=>{if(location.origin!=='https://sosavto.az'||!(window.androidBridge||window.Capacitor?.isNativePlatform?.()))return;window.__sosavtoMobileVersion=${JSON.stringify(version)};let s=document.getElementById('sa-app-style');if(!s){s=document.createElement('style');s.id='sa-app-style';document.documentElement.append(s);}s.textContent=${JSON.stringify(css)};\n${js}\n${updates}\n})();`;
 await mkdir(output,{recursive:true});
 await writeFile(output+'/mobile-app.js',bundle);
 await writeFile(output+'/mobile-version.json',JSON.stringify({version}));
 return version;
}
