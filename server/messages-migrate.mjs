import {readFile} from 'node:fs/promises';
import {query,close} from './db.mjs';
try{await query(await readFile(new URL('./messages-schema.sql',import.meta.url),'utf8'));console.log('Messaging schema ready.');}finally{await close();}
