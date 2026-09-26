// Production rollout approved on 2026-09-26. Explicit false remains a kill switch.
export function washEnabled(env=process.env){
 return env.WASH_ENABLED===undefined?env.VERCEL_ENV==='production':env.WASH_ENABLED==='true';
}
