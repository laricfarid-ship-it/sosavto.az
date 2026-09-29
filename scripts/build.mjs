import {washEnabled} from '../server/wash-config.mjs';
// Apply the additive production schema before publishing. Failure aborts this build.
if(process.env.VERCEL_ENV==='production'&&washEnabled())await import('../server/wash-migrate.mjs');
// An explicit feature flag is required; installing code never activates paid AI.
if(process.env.VERCEL_ENV==='production'&&process.env.CAR_ANALYSIS_ENABLED==='true')await import('../server/car-analysis-migrate.mjs');
import {mkdir,copyFile,readdir,rm,cp} from 'node:fs/promises';
await rm('public',{recursive:true,force:true});await mkdir('public');
for(const f of await readdir('.'))if(f.endsWith('.html')||f==='robots.txt')await copyFile(f,'public/'+f);
await cp('assets','public/assets',{recursive:true});
console.log('Public output contains only HTML, browser assets and robots.txt.');
