import {query,close} from './db.mjs';
const email=process.argv[2]; if(!email) throw new Error('Usage: npm run admin -- user@example.com');
const r=await query("UPDATE users SET role='admin' WHERE email=$1 RETURNING id",[email.toLowerCase()]);
console.log(r.rows.length ? 'Existing account promoted to admin.' : 'Account not found. Register first.'); await close();
