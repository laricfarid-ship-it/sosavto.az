import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import handler from '../api/index.mjs';
const root=process.cwd(),port=Number(process.env.PORT||4173);
const types={'.wasm':'application/wasm','.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript','.svg':'image/svg+xml','.mp4':'video/mp4','.webm':'video/webm','.webp':'image/webp','.png':'image/png','.txt':'text/plain','.webmanifest':'application/manifest+json'};
http.createServer(async(req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;
 if(path.startsWith('/api/')||path==='/sitemap.xml'||path==='/elan'||path==='/salon.html'||path==='/salon')return handler(req,res);
 let file;if(/^\/media\/[a-f0-9-]+\.(webp|mp4|webm)$/.test(path))file=resolve(root,'.data/uploads',path.split('/').pop());
 else if(['/assets/ffmpeg-core.js','/assets/ffmpeg-core.wasm'].includes(path))file=resolve(root,'node_modules/@ffmpeg/core/dist/umd',path.split('/').pop());
 else if(path==='/'||/^\/[a-z0-9-]+\.html$/.test(path)||/^\/assets\/[a-z0-9.-]+$/.test(path)||['/robots.txt','/sw.js','/manifest.webmanifest','/site.webmanifest'].includes(path))file=resolve(root,'.'+(path==='/'?'/index.html':path));
 if(!file){res.writeHead(404);return res.end('Not found');}
 try{const data=await readFile(file);res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');res.end(data);}catch{res.writeHead(404,{'Content-Type':'text/html; charset=utf-8'});res.end(await readFile('404.html','utf8'));}
}).listen(port,'0.0.0.0',()=>console.log(`SosAvto listening on port ${port}`));
