import {readFile} from 'node:fs/promises';
import {transaction,close} from './db.mjs';
try{await transaction(async c=>{await c.query("SET LOCAL lock_timeout='5s'");await c.query(await readFile(new URL('./password-reset-schema.sql',import.meta.url),'utf8'));});console.log('Password recovery schema ready.');}finally{await close();}
