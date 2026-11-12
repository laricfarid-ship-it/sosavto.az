import {readFile} from 'node:fs/promises';
import {transaction} from './db.mjs';
const sql=await readFile(new URL('./stories-schema.sql',import.meta.url),'utf8');
await transaction(async c=>{for(const statement of sql.split(';').map(s=>s.trim()).filter(Boolean))await c.query(statement);});
