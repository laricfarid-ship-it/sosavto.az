if(process.env.VERCEL_ENV==='production')await import('../server/password-reset-migrate.mjs');
import {washEnabled} from '../server/wash-config.mjs';
// Apply the additive production schema before publishing. Failure aborts this build.
if(process.env.VERCEL_ENV==='production'&&washEnabled())await import('../server/wash-migrate.mjs');
import {mkdir,copyFile,readdir,rm,cp} from 'node:fs/promises';
await rm('public',{recursive:true,force:true});await mkdir('public');
for(const f of await readdir('.'))if(f.endsWith('.html')||f==='robots.txt'||f==='sw.js'||f==='manifest.webmanifest')await copyFile(f,'public/'+f);
await cp('assets','public/assets',{recursive:true});
console.log('Public output contains only HTML, browser assets, robots.txt, the service worker and the web app manifest.');
