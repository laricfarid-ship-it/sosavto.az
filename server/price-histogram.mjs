import {search} from './listings.mjs';
export async function priceHistogram(query,params){
 const filters=new URLSearchParams(params);
 for(const key of ['price_min','price_max','page','sort'])filters.delete(key);
 const s=search(filters);
 const {rows}=await query(`WITH prices AS (SELECT l.price FROM listings l WHERE ${s.where}), bounds AS (SELECT min(price) lo,max(price) hi,count(*) total FROM prices), grouped AS (SELECT CASE WHEN b.hi=b.lo THEN 0 ELSE least(19,floor((p.price-b.lo)/(b.hi-b.lo)*20)::integer) END bucket,count(*)::integer count FROM prices p CROSS JOIN bounds b GROUP BY 1) SELECT b.lo,b.hi,b.total,g.bucket,g.count FROM bounds b LEFT JOIN grouped g ON true ORDER BY g.bucket`,s.args);
 const first=rows[0];if(!first||!Number(first.total))return {total:0,min:null,max:null,bins:[]};
 const min=Number(first.lo),max=Number(first.hi),count=min===max?1:20,width=(max-min)/count;
 const bins=Array.from({length:count},(_,i)=>({from:min+i*width,to:i===count-1?max:min+(i+1)*width,count:0}));
 for(const row of rows)bins[row.bucket].count=Number(row.count);
 return {total:Number(first.total),min,max,bins};
}
