import {fail} from './security.mjs';
const instructions='Sən SosAvto.az Azərbaycan avtomobil platformasının köməkçisisən. Azərbaycan dilində qısa və aydın cavab ver. Yalnız avtomobil, ehtiyat hissələri və xidmətlər barədə kömək et. Real elanlara, qiymət bazasına və hesablara çıxışın yoxdur; bunları uydurma. İstifadəçi verdiyi faktlarla elan təsviri hazırlaya bilərsən, məlum olmayan vəziyyət və xüsusiyyətləri uydurma. Təcili mexaniki təhlükədə peşəkar servisi tövsiyə et. Heç bir əməliyyat etdiyini demə.';
export function assistantConfig(env=process.env){
 if(env.AI_ENABLED==='false')return {enabled:false,provider:null};
 // The owner authorized this key for Preview only. Production needs explicit opt-in.
 const provider=env.AI_PROVIDER||(env.GEMINI_API_KEY&&env.VERCEL_ENV==='preview'?'gemini':'openai');
 if(provider==='gemini')return {enabled:!!env.GEMINI_API_KEY,provider:'gemini',model:'gemini-3.1-flash-lite'};
 if(provider==='openai')return {enabled:!!(env.OPENAI_API_KEY&&env.OPENAI_MODEL),provider:'openai',model:env.OPENAI_MODEL};
 return {enabled:false,provider:null};
}
export async function assistantAnswer(input,{env=process.env,request=fetch,consent=false}={}){
 const c=assistantConfig(env);if(!c.enabled)fail(503,'AI köməkçisi hələ aktivləşdirilməyib.');
 if(c.provider==='gemini'&&consent!==true)fail(400,'Mesajın Google Gemini xidmətinə göndərilməsinə razılıq tələb olunur.');
 const gemini=c.provider==='gemini';
 let response,data;
 try{
  response=await request(gemini?`https://generativelanguage.googleapis.com/v1beta/models/${c.model}:generateContent`:'https://api.openai.com/v1/responses',{
   method:'POST',headers:{'Content-Type':'application/json',...(gemini?{'x-goog-api-key':env.GEMINI_API_KEY}:{Authorization:`Bearer ${env.OPENAI_API_KEY}`})},signal:AbortSignal.timeout(20000),
   body:JSON.stringify(gemini?{systemInstruction:{parts:[{text:instructions}]},contents:[{role:'user',parts:[{text:input}]}],generationConfig:{maxOutputTokens:700,temperature:0.3}}:{model:c.model,store:false,max_output_tokens:700,instructions,input})
  });
 }catch{fail(503,'AI ilə əlaqə alınmadı. Bir qədər sonra yenidən sınayın.');}
 // Never retry or switch providers/models automatically. Never return provider errors/secrets.
 if(response.status===429)fail(429,'AI sorğu limiti bitib. Bir qədər sonra yenidən sınayın. Ödənişli xidmətə keçid edilmir.');
 if(!response.ok){
  let error;try{error=(await response.json())?.error;}catch{}
  const message=typeof error?.message==='string'?error.message:'';
  const reasons=new Set((Array.isArray(error?.details)?error.details:[]).map(d=>d?.reason));
  let reason='UPSTREAM_ERROR',notice='AI xidməti hazırda cavab vermir. Sonra yenidən sınayın.';
  if(reasons.has('API_KEY_INVALID')||/api key not valid|api key expired|api key.*leaked/i.test(message)){reason='KEY_INVALID';notice='Gemini API açarı Google tərəfindən qəbul edilmədi. Açarın ayarını yoxlamaq lazımdır.';}
  else if(/user location is not supported|not available in your country|region.*not supported/i.test(message)){reason='REGION_UNSUPPORTED';notice='Gemini bu server bölgəsi üçün əlçatan deyil. Ödəniş aktivləşdirilməyib.';}
  else if(/free tier.*not available|billing.*required|enable billing/i.test(message)){reason='FREE_TIER_UNAVAILABLE';notice='Google bu layihə üçün pulsuz istifadəni qəbul etmir. Ödəniş aktivləşdirilməyib.';}
  else if(response.status===404){reason='MODEL_UNAVAILABLE';notice='Seçilmiş Gemini modeli bu API layihəsində əlçatan deyil.';}
  else if(response.status===401||response.status===403){reason='ACCESS_DENIED';notice='Google Gemini-yə giriş icazəsi vermədi. API açarının məhdudiyyətlərini yoxlamaq lazımdır.';}
  else if(response.status===400){reason='REQUEST_REJECTED';notice='Google Gemini sorğunu qəbul etmədi. Bağlantı ayarı yoxlanmalıdır.';}
  // Never log raw provider errors, prompts, credentials or user data.
  console.warn(JSON.stringify({event:'assistant_provider_error',provider:c.provider,status:response.status,reason}));
  fail(502,notice);
 }
 try{data=await response.json();}catch{fail(502,'AI cavabı oxunmadı.');}
 let answer;
 if(giniBlocked(data,gemini))fail(422,'Bu suala cavab hazırlamaq mümkün olmadı. Sualı başqa cür yazın.');
 if(gemini)answer=(data.candidates?.[0]?.content?.parts||[]).filter(p=>!p.thought&&typeof p.text==='string').map(p=>p.text).join('\n');
 else answer=(data.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==='output_text'&&typeof x.text==='string').map(x=>x.text).join('\n');
 if(!answer?.trim())fail(502,'Cavab alınmadı. Sualı başqa cür yazın.');
 return {answer:answer.trim().slice(0,10000)};
}
function giniBlocked(data,gemini){return gemini&&(data.promptFeedback?.blockReason||!['STOP','MAX_TOKENS',undefined].includes(data.candidates?.[0]?.finishReason));}
