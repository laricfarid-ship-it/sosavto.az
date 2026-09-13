import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import handler from '../api/index.mjs';
const root=process.cwd(),port=Number(process.env.PORT||4173);
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.txt':'text/plain'};
http.createServer(async(req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;
 if(path.startsWith('/api/'))return handler(req,res);
 let file;if(/^\/media\/[a-f0-9-]+\.webp$/.test(path))file=resolve(root,'.data/uploads',path.split('/').pop());
 else if(path==='/'||/^\/[a-z0-9-]+\.html$/.test(path)||/^\/assets\/[a-z0-9.-]+$/.test(path)||path==='/robots.txt')file=resolve(root,'.'+(path==='/'?'/index.html':path));
 if(!file){res.writeHead(404);return res.end('Not found');}
 try{const data=await readFile(file);res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');res.end(data);}catch{res.writeHead(404,{'Content-Type':'text/html; charset=utf-8'});res.end(await readFile('404.html','utf8'));}
}).listen(port,'0.0.0.0',()=>console.log(`SosAvto listening on port ${port}`));
