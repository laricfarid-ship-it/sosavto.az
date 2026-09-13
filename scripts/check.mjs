import {readdir,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
for(const dir of ['assets','server','api'])for(const f of await readdir(dir))if(/\.(m?js)$/.test(f))execFileSync(process.execPath,['--check',`${dir}/${f}`]);
for(const f of await readdir('.'))if(f.endsWith('.html')){const s=await readFile(f,'utf8');if(!s.includes('lang="az"')||!s.includes('assets/app.js'))throw Error('Invalid HTML shell: '+f);if(/ADMIN_PASSWORD|sosavto_users|tailwindcss.com/.test(s))throw Error('Legacy authentication or runtime CSS remains: '+f);}
console.log('JavaScript syntax and HTML entrypoints checked.');
