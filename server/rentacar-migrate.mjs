import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {transaction,close} from './db.mjs';
import {rentalEnabled} from './rentacar.mjs';
export async function migrateRentalSchema(){
 if(!rentalEnabled())throw Error('Rent a Car migration requires explicit environment approval.');
 const sql=await readFile(new URL('./rentacar-schema.sql',import.meta.url),'utf8');
 await transaction(async c=>{for(const statement of sql.split(';').map(s=>s.trim()).filter(Boolean))await c.query(statement);});
 console.log('Rent a Car additive schema ready.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){try{await migrateRentalSchema();}finally{await close();}}
