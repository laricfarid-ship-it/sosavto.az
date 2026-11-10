import {readFile,writeFile,mkdir,readdir,unlink} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';

// Use the repository's official artwork, never a recreated mark.
export async function installLauncherIcons(res='android/app/src/main/res'){
 const svg=await readFile(new URL('../../assets/brand-sa.svg',import.meta.url),'utf8');
 const paths=[...svg.matchAll(/<path fill="([^"]+)" d="([^"]+)"\s*\/>/g)].map(([,fill,d])=>({fill,d}));
 if(paths.length!==4)throw Error('Official logo format changed; review launcher artwork before building.');
 const escape=value=>value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
 const artwork=paths.map(({fill,d})=>`    <path android:fillColor="${fill}" android:pathData="${escape(d)}"/>`).join('\n');
 const group=content=>`  <group android:scaleX="0.125" android:scaleY="0.125" android:translateX="20.875" android:translateY="39">\n${content}\n  </group>`;
 const vector=body=>`<?xml version="1.0" encoding="utf-8"?>\n<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108">\n${body}\n</vector>\n`;
 const adaptive=`<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n  <background android:drawable="@color/sosavto_launcher_background"/>\n  <foreground android:drawable="@drawable/sosavto_launcher_foreground"/>\n  <monochrome android:drawable="@drawable/sosavto_launcher_monochrome"/>\n</adaptive-icon>\n`;
 const mono=`    <path android:fillColor="#FFFFFF" android:fillType="evenOdd" android:pathData="${escape(paths[0].d+' '+paths[3].d)}"/>\n`+paths.slice(1,3).map(({d})=>`    <path android:fillColor="#FFFFFF" android:pathData="${escape(d)}"/>`).join('\n');
 const files={
  'drawable/sosavto_launcher_foreground.xml':vector(group(artwork)),
  'drawable/sosavto_launcher_monochrome.xml':vector(group(mono)),
  'values/sosavto_launcher_colors.xml':'<?xml version="1.0" encoding="utf-8"?>\n<resources><color name="sosavto_launcher_background">#FFFFFF</color></resources>\n',
  'mipmap-anydpi-v26/ic_launcher.xml':adaptive,
  'mipmap-anydpi-v26/ic_launcher_round.xml':adaptive,
  'mipmap-anydpi/ic_launcher.xml':vector('  <path android:fillColor="#FFFFFF" android:pathData="M0,0H108V108H0Z"/>\n'+group(artwork)),
  'mipmap-anydpi/ic_launcher_round.xml':vector('  <path android:fillColor="#FFFFFF" android:pathData="M54,0A54,54 0,1 1,54,108A54,54 0,1 1,54,0Z"/>\n'+group(artwork))
 };
 // Remove only generated Capacitor launcher PNGs; retain unrelated resources.
 for(const dir of await readdir(res)){
  if(!dir.startsWith('mipmap-'))continue;
  for(const name of ['ic_launcher.png','ic_launcher_round.png','ic_launcher_foreground.png'])await unlink(resolve(res,dir,name)).catch(error=>{if(error.code!=='ENOENT')throw error;});
 }
 for(const [name,content]of Object.entries(files)){
  await mkdir(dirname(resolve(res,name)),{recursive:true});
  await writeFile(resolve(res,name),content);
 }
 console.log('Installed official SosAvto launcher icons: adaptive, round, legacy and themed.');
}
