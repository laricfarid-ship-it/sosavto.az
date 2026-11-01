import {readFile} from 'node:fs/promises';
import {database,close} from './db.mjs';
if(process.env.CONFIRM_SERVICE_MIGRATION!=='yes')throw Error('Set CONFIRM_SERVICE_MIGRATION=yes after reviewing the schema.');
const sql=await readFile(new URL('./service-directory-schema.sql',import.meta.url),'utf8');
const db=await database();
try{if(db.exec)await db.exec(sql);else await db.query(sql);console.log('Service directory schema ready.');}
finally{await close();}
