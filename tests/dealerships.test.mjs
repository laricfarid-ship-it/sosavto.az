import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
process.env.LOCAL_DATABASE='true';
process.env.LOCAL_DB_PATH='memory://';
delete process.env.DATABASE_URL;
const {database,query,close}=await import('../server/db.mjs');
const {dealership}=await import('../server/dealerships.mjs');
before(async()=>{await (await database()).exec(await readFile(new URL('../server/schema.sql',import.meta.url),'utf8'));});
after(close);
test('ordinary users never have public dealership profiles',async()=>{
 const id=randomUUID();
 await query("INSERT INTO users(id,fullname,username,email,password_hash) VALUES($1,'Private Seller','private_seller','private@example.test','hash')",[id]);
 await assert.rejects(()=>dealership({},null,'/api/dealerships/private-seller','GET'),e=>e.status===404);
});
test('pending dealership cannot be viewed publicly',async()=>{
 const id=randomUUID(),owner=randomUUID();
 await query("INSERT INTO users(id,fullname,username,email,password_hash) VALUES($1,'Salon Owner','salon_owner','salon@example.test','hash')",[owner]);
 await query("INSERT INTO dealership_profiles(id,owner_user_id,slug,display_name) VALUES($1,$2,'example-salon','Example Salon')",[id,owner]);
 await assert.rejects(()=>dealership({},null,'/api/dealerships/example-salon','GET'),e=>e.status===404);
 await query("UPDATE dealership_profiles SET status='approved' WHERE id=$1",[id]);
 const r=await dealership({},null,'/api/dealerships/example-salon','GET');
 assert.equal(r.profile.slug,'example-salon');
 assert.equal(r.profile.owner_user_id,undefined);
 assert.deepEqual(r.listings,[]);
});
