import {randomUUID} from 'node:crypto';
import {transaction,query} from './db.mjs';
import {fail,uuid} from './security.mjs';

export const AI_LIMITS={images:2,texts:10,followups:3};
// Prices are deliberately not guessed. Operator must verify the full maximum request
// cost for the exact model before enabling, and fund a finite lifetime allowance.
export function aiBudgetConfig(){
 const cents=name=>{const s=process.env[name];return /^\d+$/.test(s||'')&&Number.isSafeInteger(Number(s))&&Number(s)>0?Number(s):0;};
 const config={request:cents('AI_REQUEST_RESERVE_CENTS'),day:cents('AI_DAILY_BUDGET_CENTS'),month:cents('AI_MONTHLY_BUDGET_CENTS'),total:cents('AI_TOTAL_BUDGET_CENTS')};
 return process.env.AI_ENABLED==='true'&&process.env.OPENAI_API_KEY&&process.env.OPENAI_MODEL&&process.env.AI_REVIEWED_MODEL===process.env.OPENAI_MODEL&&Object.values(config).every(Boolean)&&config.request<=Math.min(config.day,config.month,config.total)?config:null;
}
export const aiEnabled=()=>!!aiBudgetConfig();
export async function aiUsage(userId){
 const row=(await query("SELECT images,texts FROM ai_daily_usage WHERE user_id=$1 AND day=(now() AT TIME ZONE 'Asia/Baku')::date",[userId])).rows[0]||{images:0,texts:0};
 return {imagesRemaining:Math.max(0,AI_LIMITS.images-row.images),textsRemaining:Math.max(0,AI_LIMITS.texts-row.texts),followupsPerImage:AI_LIMITS.followups,resetTimezone:'Asia/Baku',premiumAvailable:false};
}
export async function reserveAI(userId,{image,threadId}={}){
 const config=aiBudgetConfig();if(!config)fail(503,'AI köməkçisi hazırda aktiv deyil.');
 if(threadId)uuid(threadId);
 return transaction(async c=>{
  // One global lock orders reservations across all serverless instances. Never
  // refund uncertain/failed provider calls: they may already have been billed.
  await c.query("INSERT INTO ai_budget_usage(bucket,reserved_cents) VALUES('total',0) ON CONFLICT DO NOTHING");
  await c.query("SELECT bucket FROM ai_budget_usage WHERE bucket='total' FOR UPDATE");
  const dates=(await c.query("SELECT (now() AT TIME ZONE 'Asia/Baku')::date::text AS day,to_char(now() AT TIME ZONE 'Asia/Baku','YYYY-MM') AS month")).rows[0];
  for(const [bucket,limit]of [['total',config.total],['day:'+dates.day,config.day],['month:'+dates.month,config.month]]){
   await c.query('INSERT INTO ai_budget_usage(bucket,reserved_cents) VALUES($1,0) ON CONFLICT DO NOTHING',[bucket]);
   const used=Number((await c.query('SELECT reserved_cents FROM ai_budget_usage WHERE bucket=$1',[bucket])).rows[0].reserved_cents);
   if(used+config.request>limit)fail(429,'Saytın AI istifadə həddi dolub. Hazırda yeni AI sorğusu qəbul edilmir.');
  }
  await c.query('INSERT INTO ai_daily_usage(user_id,day) VALUES($1,$2::date) ON CONFLICT DO NOTHING',[userId,dates.day]);
  const usage=(await c.query('SELECT images,texts FROM ai_daily_usage WHERE user_id=$1 AND day=$2::date FOR UPDATE',[userId,dates.day])).rows[0];
  let activeThread=null,remaining=null;
  if(image){
   if(usage.images>=AI_LIMITS.images)fail(429,'Gündəlik 2 şəkil limitiniz bitdi. Sabah yenidən istifadə edə bilərsiniz. Premium hələ satışda deyil.');
   await c.query('UPDATE ai_daily_usage SET images=images+1 WHERE user_id=$1 AND day=$2::date',[userId,dates.day]);
   activeThread=randomUUID();remaining=AI_LIMITS.followups;
   await c.query('INSERT INTO ai_image_threads(id,user_id,day,remaining) VALUES($1,$2,$3::date,$4)',[activeThread,userId,dates.day,remaining]);
  }else if(threadId){
   const thread=(await c.query('SELECT remaining FROM ai_image_threads WHERE id=$1 AND user_id=$2 AND day=$3::date FOR UPDATE',[threadId,userId,dates.day])).rows[0];
   if(!thread)fail(400,'Şəkil söhbəti tapılmadı və ya günü bitib. Yeni söhbət başlayın.');
   if(thread.remaining<=0)fail(429,'Bu şəkil üzrə 3 əlavə sual haqqınız bitdi. Yeni mövzu üçün gündəlik mətn haqqınızdan istifadə edə bilərsiniz.');
   remaining=thread.remaining-1;activeThread=threadId;
   await c.query('UPDATE ai_image_threads SET remaining=$1 WHERE id=$2',[remaining,threadId]);
  }else{
   if(usage.texts>=AI_LIMITS.texts)fail(429,'Gündəlik 10 mətn sualı limitiniz bitdi. Sabah yenidən istifadə edə bilərsiniz.');
   await c.query('UPDATE ai_daily_usage SET texts=texts+1 WHERE user_id=$1 AND day=$2::date',[userId,dates.day]);
  }
  for(const bucket of ['total','day:'+dates.day,'month:'+dates.month])await c.query('UPDATE ai_budget_usage SET reserved_cents=reserved_cents+$1 WHERE bucket=$2',[config.request,bucket]);
  const reservationId=randomUUID();await c.query('INSERT INTO ai_requests(id,user_id,thread_id,model,reserved_cents) VALUES($1,$2,$3,$4,$5)',[reservationId,userId,activeThread,process.env.OPENAI_MODEL,config.request]);
  return {reservationId,threadId:activeThread,followupsRemaining:remaining};
 });
}
export async function finishAI(id,status){await query('UPDATE ai_requests SET status=$1 WHERE id=$2',[status,id]);}
