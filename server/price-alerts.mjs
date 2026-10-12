import {randomUUID} from 'node:crypto';

// Only server-owned snapshots survive edits; submitted details are allowlisted.
export function preservePublishedPrice(listing, input){
 const snapshot=listing.status==='active'
  ?{price:String(listing.price),category:listing.category}
  :listing.details?._publishedPrice;
 if(snapshot)input.details=JSON.stringify({...JSON.parse(input.details),_publishedPrice:snapshot});
}

// Caller holds the listing row lock and publishes in the same transaction.
export async function publishPriceAlerts(c,listing){
 const previous=listing.details?._publishedPrice;
 if(previous&&previous.category===listing.category&&Number(listing.price)<Number(previous.price)){
  const recipients=await c.query("SELECT f.user_id FROM favorites f JOIN users u ON u.id=f.user_id WHERE f.listing_id=$1 AND f.user_id<>$2 AND u.status='active'",[listing.id,listing.user_id]);
  const money=n=>Number(n).toLocaleString('az-AZ',{maximumFractionDigits:2});
  const body=`Qiymət düşdü: ${listing.title} — ${money(previous.price)} ₼ → ${money(listing.price)} ₼. Elanı Seçilmişlər bölməsində görə bilərsiniz.`;
  for(const {user_id} of recipients.rows)await c.query('INSERT INTO notifications(id,user_id,body) VALUES($1,$2,$3)',[randomUUID(),user_id,body]);
 }
 await c.query("UPDATE listings SET details=details||jsonb_build_object('_publishedPrice',jsonb_build_object('price',price::text,'category',category)) WHERE id=$1",[listing.id]);
}
