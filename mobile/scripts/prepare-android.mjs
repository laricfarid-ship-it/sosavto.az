import {installLauncherIcons} from './launcher-icons.mjs';
import {readFile,writeFile,copyFile,mkdir} from 'node:fs/promises';
const css=await readFile('ui/app.css','utf8');
const js=await readFile('ui/app.js','utf8');
const asset=`(()=>{if(location.origin!=='https://sosavto.az'||window.__sosavtoAppUI)return;if(!document.getElementById('sa-app-style')){const s=document.createElement('style');s.id='sa-app-style';s.textContent=${JSON.stringify(css)};document.documentElement.append(s);}})();\nif(!window.__sosavtoAppUI){${js}\n}`;
await mkdir('android/app/src/main/assets',{recursive:true});
await writeFile('android/app/src/main/assets/app-presentation.js',asset);
await copyFile('native/MainActivity.java','android/app/src/main/java/az/sosavto/app/MainActivity.java');
const file='android/app/build.gradle';
let gradle=await readFile(file,'utf8');
gradle=gradle.replace(/versionCode 1\b/,'versionCode '+(100+Number(process.env.GITHUB_RUN_NUMBER||1))).replace(/versionName "1.0"/,'versionName "0.2.'+(process.env.GITHUB_RUN_NUMBER||1)+'"');
await writeFile(file,gradle);
console.log('Installed APK-only UI and native activity.');

await installLauncherIcons();
