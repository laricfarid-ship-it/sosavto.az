import pg from 'pg';
let db;
export async function database() {
 if(db) return db;
 if(process.env.DATABASE_URL) db = new pg.Pool({connectionString:process.env.DATABASE_URL,max:5});
 else if(process.env.LOCAL_DATABASE === 'true' && process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const {PGlite} = await import('@electric-sql/pglite');
  db = new PGlite(process.env.LOCAL_DB_PATH || '.data/postgres');
 } else throw new Error('DATABASE_NOT_CONFIGURED');
 return db;
}
export async function query(sql,args=[]) { return (await database()).query(sql,args); }
export async function transaction(fn) {
 const d=await database();
 if(d instanceof pg.Pool) { const c=await d.connect(); try {await c.query('BEGIN');const r=await fn(c);await c.query('COMMIT');return r;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();} }
 return d.transaction(fn);
}
export async function close(){if(db) {await (db.end ? db.end():db.close());db=null;}}
