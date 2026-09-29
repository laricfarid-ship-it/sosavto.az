import test,{before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Readable} from 'node:stream';
import {randomUUID,randomBytes} from 'node:crypto';
import sharp from 'sharp';
process.env.LOCAL_DATABASE='true';process.env.LOCAL_DB_PATH='memory://';process.env.APP_ORIGIN='http://localhost:4173';delete process.env.DATABASE_URL;delete process.env.VERCEL;
const {database,query,close}=await import('../server/db.mjs');
const {hash}=await import('../server/security.mjs');
const {validateAnalysis}=await import('../server/car-analysis.mjs');
const {default:handler}=await import('../api/index.mjs');
const originalFetch=globalThis.fetch;let admin,other,images,calls,responseMode;
const good=()=>({same_vehicle:'yes',views:Object.fromEntries(['front','rear','interior'].map(r=>[r,{matches_role:true,usable:true}])),brand:{value:'Hyundai',confidence:'high'},model:{value:'Elantra',confidence:'medium'},color:{value:'Ağ',confidence:'high'},body:{value:'Sedan',confidence:'medium'},notes:['Modeli sənədlə yoxlayın.']});
async function user(role){const id=randomUUID(),token=randomBytes(32).toString('hex');await query('INSERT INTO users(id,fullname,username,email,password_hash,role) VALUES($1,$2,$2,$3,$4,$5)',[id,role+id,`${id}@test.invalid`,'unused',role]);await query("INSERT INTO sessions VALUES($1,$2,now()+interval '1 hour')",[hash(token),id]);return {id,cookie:'sosavto_session='+token};}
async function req(path,{method='POST',data={images,client_key:randomUUID()},cookie=admin.cookie,origin=process.env.APP_ORIGIN}={}){
 const r=Readable.from([JSON.stringify(data)]);r.method=method;r.url='/api'+path;r.headers={cookie,origin,'content-type':'application/json'};r.socket={remoteAddress:'192.0.2.1'};const out={};const res={statusCode:200,setHeader(){},end(v){out.body=JSON.parse(v);}};await handler(r,res);out.status=res.statusCode;return out;
}
before(async()=>{
 const d=await database();await d.exec(await readFile(new URL('../server/schema.sql',import.meta.url),'utf8'));await d.exec(await readFile(new URL('../server/car-analysis-schema.sql',import.meta.url),'utf8'));
 admin=await user('admin');other=await user('user');images=await Promise.all(['front','rear','interior'].map(async(role,i)=>({role,data:'data:image/png;base64,'+(await sharp({create:{width:480,height:320,channels:3,background:['#fff','#333','#b00'][i]}}).png().toBuffer()).toString('base64')})));
});
beforeEach(async()=>{
 await query('DELETE FROM car_analyses');await query('DELETE FROM rate_limits');calls=[];responseMode='good';process.env.CAR_ANALYSIS_ENABLED='true';process.env.CAR_ANALYSIS_AUDIENCE='admin';process.env.ANTHROPIC_API_KEY='test-only-key';process.env.ANTHROPIC_MODEL='test-model';
 globalThis.fetch=async(url,options)=>{
  calls.push({url,options});if(responseMode==='timeout')throw new DOMException('Timeout','TimeoutError');
  if(responseMode==='429')return {ok:false,status:429};
  const value=good();if(responseMode==='mixed')value.same_vehicle='no';if(responseMode==='wrong-view')value.views.interior.matches_role=false;
  return {ok:true,json:async()=>({stop_reason:responseMode==='truncated'?'max_tokens':'end_turn',content:[{type:'text',text:responseMode==='bad-json'?'```json broken':JSON.stringify(value)}],usage:{input_tokens:900,output_tokens:200}})};
 };
});
after(async()=>{globalThis.fetch=originalFetch;await close();});
test('feature fails closed without flag/key/model and defaults to admin-only',async()=>{
 for(const setting of ['CAR_ANALYSIS_ENABLED','ANTHROPIC_API_KEY','ANTHROPIC_MODEL']){const old=process.env[setting];delete process.env[setting];assert.equal((await req('/analyze-car')).status,503);process.env[setting]=old;}
 assert.equal((await req('/analyze-car',{cookie:''})).status,401);
 assert.equal((await req('/analyze-car',{cookie:other.cookie})).status,403);assert.equal(calls.length,0);
 const config=await req('/config',{method:'GET'});assert.equal(config.body.carAnalysis,true);assert.ok(!JSON.stringify(config.body).includes('test-only-key'));
});
test('CSRF blocks provider calls before image work',async()=>{assert.equal((await req('/analyze-car',{origin:'https://elsewhere.invalid'})).status,403);assert.equal(calls.length,0);});
test('requires exactly three different required views',async()=>{
 for(const input of [images.slice(0,2),[...images,images[0]],[images[0],images[0],images[2]],images.map(p=>({...p,role:'side'}))])assert.equal((await req('/analyze-car',{data:{images:input,client_key:randomUUID()}})).status,400);
 const duplicate=images.map(p=>({...p,data:images[0].data}));assert.equal((await req('/analyze-car',{data:{images:duplicate,client_key:randomUUID()}})).status,400);assert.equal(calls.length,0);
});
test('rejects corrupt, tiny, oversized and disguised SVG images',async()=>{
 const tiny='data:image/png;base64,'+(await sharp({create:{width:10,height:10,channels:3,background:'#fff'}}).png().toBuffer()).toString('base64');
 const svg='data:image/png;base64,'+Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320"/>').toString('base64');
 for(const data of ['data:image/png;base64,YWJj',tiny,svg,'data:image/png;base64,'+'A'.repeat(1000000)]){const input=[{...images[0],data},...images.slice(1)];assert.equal((await req('/analyze-car',{data:{images:input,client_key:randomUUID()}})).status,400);}
 assert.equal(calls.length,0);
});
test('provider gets normalized three-image schema request; result is private, saved and retrievable',async()=>{
 process.env.CAR_ANALYSIS_INPUT_USD_PER_MILLION='3';process.env.CAR_ANALYSIS_OUTPUT_USD_PER_MILLION='15';
 const r=await req('/analyze-car');assert.equal(r.status,200,JSON.stringify(r.body));assert.equal(r.body.result.suggestions.model.value,'Elantra');
 const call=calls[0],sent=JSON.parse(call.options.body);assert.equal(call.url,'https://api.anthropic.com/v1/messages');assert.equal(sent.output_config.format.type,'json_schema');assert.equal(sent.messages[0].content.filter(x=>x.type==='image').length,3);assert.ok(sent.messages[0].content.filter(x=>x.type==='image').every(x=>x.source.media_type==='image/jpeg'));assert.ok(call.options.signal);
 const row=(await query('SELECT * FROM car_analyses WHERE id=$1',[r.body.id])).rows[0];assert.equal(row.status,'complete');assert.equal(row.usage.input_tokens,900);assert.ok(Number(row.estimated_cost_usd)>0);assert.ok(row.raw_output);assert.ok(!row.result.suggestions.year);
 assert.equal((await req('/car-analyses/'+r.body.id,{method:'GET'})).status,200);process.env.CAR_ANALYSIS_AUDIENCE='all';assert.equal((await req('/car-analyses/'+r.body.id,{method:'GET',cookie:other.cookie})).status,404);
});
test('same request and same pictures with a new key reuse results without provider spend',async()=>{
 const data={images,client_key:randomUUID()};const a=await req('/analyze-car',{data});const b=await req('/analyze-car',{data});const c=await req('/analyze-car');assert.equal(a.body.id,b.body.id);assert.equal(a.body.id,c.body.id);assert.equal(calls.length,1);
 const altered=[images[1],images[0],images[2]].map((x,i)=>({...x,role:images[i].role}));assert.equal((await req('/analyze-car',{data:{...data,images:altered}})).status,409);
});
test('concurrent duplicate requests reserve once and never send two provider requests',async()=>{
 const data={images,client_key:randomUUID()};const r=await Promise.all([req('/analyze-car',{data}),req('/analyze-car',{data})]);assert.ok(r.every(x=>[200,409].includes(x.status)));assert.equal(calls.length,1);
});
test('mixed cars or an incorrect view cannot produce applicable suggestions',async()=>{
 for(const mode of ['mixed','wrong-view']){await query('DELETE FROM car_analyses');responseMode=mode;const r=await req('/analyze-car');assert.equal(r.status,200);assert.equal(r.body.result.status,'needs_photos');assert.deepEqual(r.body.result.suggestions,{});}
});
test('uncertain and catalog-incompatible values are withheld',()=>{
 const value=good();value.model.value='Elantra ultra-unknown';value.color.confidence='low';const r=validateAnalysis(value);assert.equal(r.suggestions.model,undefined);assert.equal(r.suggestions.color,undefined);assert.ok(r.suggestions.brand);
 value.brand.confidence='unknown';value.model.value='Elantra';assert.equal(validateAnalysis(value).suggestions.model,undefined);
 value.notes=['x'.repeat(501)];assert.throws(()=>validateAnalysis(value),e=>e.status===502);
});
test('invalid JSON, truncation, timeout and upstream rate limits keep records but never invent a result',async()=>{
 for(const mode of ['bad-json','truncated','timeout','429']){await query('DELETE FROM car_analyses');responseMode=mode;const r=await req('/analyze-car');assert.ok([502,503].includes(r.status));assert.ok(!r.body.result);const row=(await query('SELECT * FROM car_analyses')).rows[0];assert.equal(row.status,'error');assert.ok(row.error_code);assert.ok(!JSON.stringify(r.body).includes('test-only-key'));}
});
test('two-attempt allowance includes provider errors and cannot be bypassed with fresh client keys',async()=>{
 responseMode='timeout';assert.equal((await req('/analyze-car')).status,502);assert.equal((await req('/analyze-car')).status,502);assert.equal((await req('/analyze-car')).status,429);assert.equal(calls.length,2);
});
test('global paid-call ceiling prevents provider calls',async()=>{
 await query("INSERT INTO rate_limits VALUES($1,20,now()+interval '1 day')",[hash('car-analysis:global')]);assert.equal((await req('/analyze-car')).status,429);assert.equal(calls.length,0);
});
test('interrupted pending analysis becomes an error without replaying a possibly paid call',async()=>{
 const data={images,client_key:randomUUID()},r=await req('/analyze-car',{data});await query("UPDATE car_analyses SET status='pending',created_at=now()-interval '2 minutes' WHERE id=$1",[r.body.id]);assert.equal((await req('/analyze-car',{data})).status,502);assert.equal(calls.length,1);
});
