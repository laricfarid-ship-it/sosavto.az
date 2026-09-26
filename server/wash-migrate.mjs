import {readFile} from 'node:fs/promises';
import {query,close} from './db.mjs';
try{await query(await readFile(new URL('./wash-schema.sql',import.meta.url),'utf8'));console.log('Avtoyuma cədvəlləri hazırdır.');}finally{await close();}
