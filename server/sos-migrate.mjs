import {readFile} from 'node:fs/promises';
import {database,close} from './db.mjs';
if(process.env.SOS_ENABLED!=='true')throw new Error('Set SOS_ENABLED=true on the isolated test environment first.');
const db=await database();
try{const sql=await readFile(new URL('./sos-schema.sql',import.meta.url),'utf8');if(db.exec)await db.exec(sql);else await db.query(sql);console.log('SOS schema ready.');}finally{await close();}
