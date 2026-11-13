export function quoteRental(car,days){
 if(!Number.isInteger(days)||days<1||days>365)throw Error('İcarə müddəti 1–365 gün olmalıdır.');
 if(!['daily_cents','weekly_cents','monthly_cents'].every(k=>Number.isInteger(car[k])&&car[k]>0))throw Error('İcarə qiymətləri düzgün deyil.');
 const dp=[0];for(let d=1;d<=days;d++)dp[d]=Math.min(dp[d-1]+car.daily_cents,d>=7?dp[d-7]+car.weekly_cents:Infinity,d>=30?dp[d-30]+car.monthly_cents:Infinity);
 if(!Number.isSafeInteger(dp[days])||dp[days]>2147483647)throw Error('Qiymət hesablanmadı.');return dp[days];
}
export function rentalToday(now=new Date()){
 return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Baku',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
}
export const rentalStatus={pending:'Yoxlanılır',approved:'Təsdiqlənib',active:'Aktiv',confirmed:'Təsdiqlənib',rejected:'Rədd edilib',cancelled:'Ləğv edilib',completed:'Tamamlanıb',archived:'Arxivdə'};
