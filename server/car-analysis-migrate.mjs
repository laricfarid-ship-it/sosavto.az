import {readFile} from 'node:fs/promises';
import {query,close} from './db.mjs';
try {await query(await readFile(new URL('./car-analysis-schema.sql',import.meta.url),'utf8'));console.log('Car analysis schema ready.');}finally{await close();}
