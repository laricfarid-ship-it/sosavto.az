import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
process.env.LOCAL_DATABASE='true';process.env.LOCAL_DB_PATH='memory://';delete process.env.DATABASE_URL;
const {database,query,close}=await import('../server/db.mjs');
const {reserveAI,aiBudgetConfig,aiUsage}=await import('../server/ai-limits.mjs');
let a,b;
const configure=()=>Object.assign(process.env,{AI_ENABLED:'true',OPENAI_API_KEY:'test',OPENAI_MODEL:'reviewed-model',AI_REVIEWED_MODEL:'reviewed-model',AI_REQUEST_RESERVE_CENTS:'2',AI_DAILY_BUDGET_CENTS:'100',AI_MONTHLY_BUDGET_CENTS:'200',AI_TOTAL_BUDGET_CENTS:'300'});
before(async()=>{await (await database()).exec(await readFile(new URL('../server/schema.sql',import.meta.url),'utf8'));configure();a=randomUUID();b=randomUUID();for(const id of [a,b])await query('INSERT INTO users(id,fullname,username,email,password_hash) VALUES($1::uuid,$1::text,$1::text,$1::text,$1::text)',[id]);});
after(close);
test('missing config, changed model, and kill switch fail closed',async()=>{
 process.env.AI_ENABLED='false';assert.equal(aiBudgetConfig(),null);await assert.rejects(()=>reserveAI(a,{}),/aktiv deyil/);configure();process.env.OPENAI_MODEL='expensive-other-model';assert.equal(aiBudgetConfig(),null);configure();process.env.AI_TOTAL_BUDGET_CENTS='';assert.equal(aiBudgetConfig(),null);configure();
});
test('two images and three owned followups are enforced and rejected calls do not spend budget',async()=>{
 const first=await reserveAI(a,{image:true});assert.equal(first.followupsRemaining,3);await reserveAI(a,{image:true});
 const spent=Number((await query("SELECT reserved_cents FROM ai_budget_usage WHERE bucket='total'")).rows[0].reserved_cents);
 await assert.rejects(()=>reserveAI(a,{image:true}),/2 şəkil/);
 await assert.rejects(()=>reserveAI(b,{threadId:first.threadId}),/tapılmadı/);
 assert.equal(Number((await query("SELECT reserved_cents FROM ai_budget_usage WHERE bucket='total'")).rows[0].reserved_cents),spent);
 for(let i=2;i>=0;i--)assert.equal((await reserveAI(a,{threadId:first.threadId})).followupsRemaining,i);
 await assert.rejects(()=>reserveAI(a,{threadId:first.threadId}),/3 əlavə/);assert.equal((await aiUsage(a)).imagesRemaining,0);
});
test('text quota cannot be bypassed by a new conversation',async()=>{for(let i=0;i<10;i++)await reserveAI(b,{});await assert.rejects(()=>reserveAI(b,{}),/10 mətn/);assert.equal((await aiUsage(b)).textsRemaining,0);});
test('site total budget is persistent and blocks even with unused user quota',async()=>{
 const spent=Number((await query("SELECT reserved_cents FROM ai_budget_usage WHERE bucket='total'")).rows[0].reserved_cents);process.env.AI_TOTAL_BUDGET_CENTS=String(spent);
 await assert.rejects(()=>reserveAI(a,{}),/Saytın AI/);assert.equal((await aiUsage(a)).textsRemaining,10);configure();
});
test('daily and monthly budget caps separately reject before reserving',async()=>{
 const amount=Number((await query("SELECT reserved_cents FROM ai_budget_usage WHERE bucket='total'")).rows[0].reserved_cents);
 process.env.AI_DAILY_BUDGET_CENTS=String(amount);await assert.rejects(()=>reserveAI(a,{}),/Saytın AI/);configure();process.env.AI_MONTHLY_BUDGET_CENTS=String(amount);await assert.rejects(()=>reserveAI(a,{}),/Saytın AI/);configure();
});

test('simultaneous requests cannot overrun the last global reservation',async()=>{
 const spent=Number((await query("SELECT reserved_cents FROM ai_budget_usage WHERE bucket='total'")).rows[0].reserved_cents);
 process.env.AI_TOTAL_BUDGET_CENTS=String(spent+2);
 const results=await Promise.allSettled([reserveAI(a,{}),reserveAI(a,{})]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(Number((await query("SELECT reserved_cents FROM ai_budget_usage WHERE bucket='total'")).rows[0].reserved_cents),spent+2);configure();
});
