// LOCAL BROWSER TEST FIXTURE ONLY. Never used by api/index.mjs or production build.
import http from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
if(process.env.VERCEL||process.env.NODE_ENV==='production')throw Error('Local fixture must not run in production');
delete process.env.DATABASE_URL;
process.env.LOCAL_DATABASE='true';process.env.LOCAL_DB_PATH='memory://';process.env.APP_ORIGIN='http://localhost:4174';
process.env.CAR_ANALYSIS_ENABLED='true';process.env.CAR_ANALYSIS_AUDIENCE='admin';process.env.ANTHROPIC_API_KEY='local-fixture-only';process.env.ANTHROPIC_MODEL='fixture-model';
const {database,query}=await import('../server/db.mjs');const {createSession}=await import('../server/security.mjs');const {default:handler}=await import('../api/index.mjs');
const db=await database();for(const file of ['schema.sql','car-analysis-schema.sql'])await db.exec(await readFile(new URL('../server/'+file,import.meta.url),'utf8'));
const id=randomUUID();await query("INSERT INTO users(id,fullname,username,email,password_hash,role) VALUES($1,'Browser Test','browser_test','browser@test.invalid','unused','admin')",[id]);
let calls=0;
globalThis.fetch=async url=>{
 if(url!=='https://api.anthropic.com/v1/messages')throw Error('Unexpected fixture network request');calls++;
 return {ok:true,json:async()=>({stop_reason:'end_turn',usage:{input_tokens:900,output_tokens:200},content:[{type:'text',text:JSON.stringify({same_vehicle:'yes',views:Object.fromEntries(['front','rear','interior'].map(r=>[r,{matches_role:true,usable:true}])),brand:{value:'Hyundai',confidence:'high'},model:{value:'Elantra',confidence:'medium'},color:{value:'Ağ',confidence:'high'},body:{value:'Sedan',confidence:'medium'},notes:['Yalnız texniki sınaq cavabıdır; real tanıma deyil.']})}]})};
};
await mkdir('.data/car-analysis-fixtures',{recursive:true});
for(const [i,name]of ['front','rear','interior'].entries())await writeFile(`.data/car-analysis-fixtures/${name}.png`,await sharp({create:{width:640,height:400,channels:3,background:['#85bcc6','#3e6675','#d4ac72'][i]}}).png().toBuffer());
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
http.createServer(async(req,res)=>{
 const path=new URL(req.url,process.env.APP_ORIGIN).pathname;
 if(path==='/__test/login'){await createSession(res,{id});res.writeHead(302,{Location:'/elan-ver.html'});return res.end();}
 if(path==='/__test/state'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({calls,analyses:(await query('SELECT status FROM car_analyses')).rows,images:(await query('SELECT id,listing_id FROM images')).rows,listings:(await query('SELECT status,brand,model,year FROM listings')).rows}));}
 if(path.startsWith('/api/'))return handler(req,res);
 let file;if(path==='/'||/^\/[a-z0-9-]+\.html$/.test(path)||/^\/assets\/[a-z0-9.-]+$/.test(path))file=resolve('.'+(path==='/'?'/index.html':path));
 if(/^\/media\/[a-f0-9-]+\.webp$/.test(path))file=resolve('.data/uploads',path.split('/').pop());
 if(!file){res.statusCode=404;return res.end();}
 try{const data=await readFile(file);res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');res.end(data);}catch{res.statusCode=404;res.end();}
}).listen(4174,'127.0.0.1',()=>console.log('Local-only mocked AI browser fixture: http://localhost:4174/__test/login'));
