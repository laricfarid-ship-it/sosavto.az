import {mkdir,copyFile,readdir,rm,cp} from 'node:fs/promises';
await rm('public',{recursive:true,force:true});await mkdir('public');
for(const f of await readdir('.'))if(f.endsWith('.html')||f==='robots.txt')await copyFile(f,'public/'+f);
await cp('assets','public/assets',{recursive:true});
console.log('Public output contains only HTML, browser assets and robots.txt.');
