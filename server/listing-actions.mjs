import {fail} from './security.mjs';

// Listing lock serializes owner changes with creation of wash reservations.
export async function lockListing(c,id,user){
 const l=(await c.query('SELECT * FROM listings WHERE id=$1 FOR UPDATE',[id])).rows[0];
 if(!l||l.details?._deleted)fail(404,'Elan tapılmadı.');
 if(l.user_id!==user.id)fail(403,'Yalnız öz elanınızı dəyişə bilərsiniz.');
 return l;
}
export async function washLinks(c,id){
 // The marketplace must also work before the optional wash migration is installed.
 if(!(await c.query("SELECT to_regclass('public.wash_shops') AS name")).rows[0].name)return false;
 return !!(await c.query('SELECT id FROM wash_shops WHERE id=$1',[id])).rows.length;
}
export async function requireNoReservations(c,id){
 const busy=await c.query("SELECT b.id FROM wash_bookings b JOIN wash_slots s ON s.id=b.slot_id WHERE s.shop_id=$1 AND (b.status IN ('confirmed','arrived') OR (b.status='held' AND b.expires_at>now())) LIMIT 1",[id]);
 if(busy.rows.length)fail(409,'Bu avtoyumanın aktiv rezervləri var. Avtoyuma bölməsində rezervləri tamamlayın və ya ləğv edin, sonra yenidən sınayın.');
}
export async function deleteListing(c,id,user){
 await lockListing(c,id,user);
 if(await washLinks(c,id)){
  await requireNoReservations(c,id);
  const history=(await c.query('SELECT b.id FROM wash_bookings b JOIN wash_slots s ON s.id=b.slot_id WHERE s.shop_id=$1 LIMIT 1',[id])).rows.length;
  if(history){
   // Preserve booking snapshots, reviews and payment history, hide the listing permanently.
   await c.query("UPDATE listings SET status='archived',details=details||'{\"_deleted\":true}'::jsonb,updated_at=now() WHERE id=$1",[id]);
   await c.query('UPDATE wash_slots SET closed=true WHERE shop_id=$1',[id]);
   await c.query('DELETE FROM favorites WHERE listing_id=$1',[id]);
   return;
  }
  await c.query('DELETE FROM wash_slots WHERE shop_id=$1',[id]);
  await c.query('DELETE FROM wash_shops WHERE id=$1',[id]);
 }
 await c.query('DELETE FROM listings WHERE id=$1 AND user_id=$2',[id,user.id]);
}
