import {readFile} from 'node:fs/promises';
import {database,close} from './db.mjs';
const d=await database(); const sql=await readFile(new URL('./schema.sql',import.meta.url),'utf8');
if(d.exec) await d.exec(sql); else await d.query(sql);
console.log('Database schema ready.'); await close();
