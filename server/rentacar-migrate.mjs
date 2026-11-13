// Explicit opt-in: no automatic build-time or production migration.
import {readFile} from 'node:fs/promises';
import {transaction,close} from './db.mjs';
if(process.env.VERCEL_ENV==='production'||process.env.RENTACAR_ISOLATED_DB!=='true')throw Error('Rent a Car requires an explicitly isolated test database.');
try{
 const sql=await readFile(new URL('./rentacar-schema.sql',import.meta.url),'utf8');
 await transaction(async c=>{for(const statement of sql.split(';').map(s=>s.trim()).filter(Boolean))await c.query(statement);});
 console.log('Rent a Car additive test schema ready.');
}finally{await close();}
