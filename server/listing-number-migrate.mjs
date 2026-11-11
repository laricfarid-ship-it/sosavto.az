import {transaction} from './db.mjs';
await transaction(async c=>{
 await c.query('CREATE SEQUENCE IF NOT EXISTS listing_numbers START WITH 100001');
 await c.query('ALTER TABLE listings ADD COLUMN IF NOT EXISTS listing_number bigint');
 await c.query("ALTER TABLE listings ALTER COLUMN listing_number SET DEFAULT nextval('listing_numbers')");
 await c.query("UPDATE listings SET listing_number=nextval('listing_numbers') WHERE listing_number IS NULL");
 await c.query('ALTER TABLE listings ALTER COLUMN listing_number SET NOT NULL');
 await c.query('CREATE UNIQUE INDEX IF NOT EXISTS listings_number_unique ON listings(listing_number)');
});
