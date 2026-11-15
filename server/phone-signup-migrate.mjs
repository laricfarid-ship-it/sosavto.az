import {readFile} from 'node:fs/promises';
import {transaction,close} from './db.mjs';
try{await transaction(async c=>{await c.query("SET LOCAL lock_timeout='5s'");for(const statement of (await readFile(new URL('./phone-signup-schema.sql',import.meta.url),'utf8')).split(';').filter(s=>s.trim()))await c.query(statement);});console.log('Phone signup schema ready.');}finally{await close();}
