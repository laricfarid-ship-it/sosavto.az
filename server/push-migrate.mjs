import {readFile} from 'node:fs/promises';
import pg from 'pg';
// Use a direct connection for the additive migration, retaining pooling at runtime.
const url=new URL(process.env.DATABASE_URL_UNPOOLED||process.env.DATABASE_URL);
url.hostname=url.hostname.replace('-pooler.','.');
const pool=new pg.Pool({connectionString:url.toString(),max:1});
try{const c=await pool.connect();try{await c.query('BEGIN');await c.query("SET LOCAL lock_timeout='5s'");await c.query(await readFile(new URL('./push-schema.sql',import.meta.url),'utf8'));await c.query('COMMIT');console.log('Admin phone notification schema ready.');}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}finally{await pool.end();}
