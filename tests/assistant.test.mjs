import test from 'node:test';import assert from 'node:assert/strict';
import {assistantConfig,assistantAnswer} from '../server/assistant.mjs';
const env={GEMINI_API_KEY:'test-secret',VERCEL_ENV:'preview'};
const reply=(data,status=200)=>({ok:status===200,status,json:async()=>data});
test('Gemini requires an environment key; explicit kill switch wins',()=>{assert.equal(assistantConfig(env).enabled,true);assert.equal(assistantConfig({...env,VERCEL_ENV:'production'}).enabled,true);assert.equal(assistantConfig({VERCEL_ENV:'production'}).enabled,false);assert.equal(assistantConfig({...env,AI_ENABLED:'false'}).enabled,false);});
test('Gemini keeps key in header and sends only text with bounded output',async()=>{let calls=0;const r=await assistantAnswer('Avtomobil seçimi',{env,consent:true,request:async(url,options)=>{calls++;assert.match(url,/gemini-3.1-flash-lite:generateContent$/);assert.equal(url.includes('test-secret'),false);assert.equal(options.headers['x-goog-api-key'],'test-secret');const body=JSON.parse(options.body);assert.equal(body.generationConfig.maxOutputTokens,700);assert.equal(body.tools,undefined);assert.equal(body.contents[0].parts[0].text,'Avtomobil seçimi');return reply({candidates:[{finishReason:'STOP',content:{parts:[{thought:true,text:'private thought'},{text:'Salam!'}]}}]});}});assert.equal(r.answer,'Salam!');assert.equal(calls,1);});
test('no consent means no external request',async()=>{await assert.rejects(assistantAnswer('Salam',{env,request:()=>assert.fail('must not call')}),e=>e.status===400);});
test('quota never retries, leaks secrets or falls back to OpenAI',async()=>{let calls=0;await assert.rejects(assistantAnswer('Salam',{env:{...env,OPENAI_API_KEY:'other',OPENAI_MODEL:'other'},consent:true,request:async()=>{calls++;return reply({error:'test-secret'},429);}}),e=>e.status===429&&!e.message.includes('test-secret'));assert.equal(calls,1);});
test('safety block and empty replies are honest errors',async()=>{for(const data of [{promptFeedback:{blockReason:'SAFETY'}},{candidates:[]}])await assert.rejects(assistantAnswer('Salam',{env,consent:true,request:async()=>reply(data)}),e=>[422,502].includes(e.status));});
test('network and provider failures do not expose error body',async()=>{await assert.rejects(assistantAnswer('Salam',{env,consent:true,request:async()=>{throw Error('test-secret');}}),e=>e.status===503&&!e.message.includes('test-secret'));await assert.rejects(assistantAnswer('Salam',{env,consent:true,request:async()=>reply({},403)}),e=>e.status===502);});
test('existing explicitly selected OpenAI remains functional',async()=>{const r=await assistantAnswer('Salam',{env:{AI_PROVIDER:'openai',OPENAI_API_KEY:'test',OPENAI_MODEL:'test'},request:async url=>{assert.equal(url,'https://api.openai.com/v1/responses');return reply({output:[{content:[{type:'output_text',text:'Cavab'}]}]});}});assert.equal(r.answer,'Cavab');});
test('provider diagnostics classify failures without leaking raw error or credentials',async()=>{
 const original=console.warn,logs=[];console.warn=x=>logs.push(x);
 try{
 for(const [status,error,reason] of [
 [400,{message:'API key not valid test-secret'},'KEY_INVALID'],
 [400,{message:'User location is not supported test-secret'},'REGION_UNSUPPORTED'],
 [404,{message:'test-secret'},'MODEL_UNAVAILABLE'],
 [403,{message:'test-secret'},'ACCESS_DENIED']]){
 await assert.rejects(assistantAnswer('private prompt',{env,consent:true,request:async()=>reply({error},status)}),e=>e.status===502&&!e.message.includes('test-secret'));
 assert.equal(JSON.parse(logs.at(-1)).reason,reason);
 }
 assert.equal(logs.some(x=>x.includes('test-secret')||x.includes('private prompt')),false);
 }finally{console.warn=original;}
});
