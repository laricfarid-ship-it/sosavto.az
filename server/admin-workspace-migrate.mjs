import {query} from './db.mjs';
const sql=`CREATE TABLE IF NOT EXISTS admin_finance_entries (
 id uuid PRIMARY KEY,
 entry_date date NOT NULL,
 kind text NOT NULL CHECK(kind IN ('income','expense')),
 category text NOT NULL,
 description text NOT NULL DEFAULT '',
 amount_cents bigint NOT NULL CHECK(amount_cents > 0),
 created_by uuid REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_finance_entries_date ON admin_finance_entries(entry_date DESC,created_at DESC);

-- Administrative business approvals, manual social publishing queue, Android release registry
CREATE TABLE IF NOT EXISTS admin_business_profiles (user_id uuid PRIMARY KEY REFERENCES users(id),business_name text NOT NULL,business_type text NOT NULL,status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS admin_social_queue (id uuid PRIMARY KEY,listing_id uuid REFERENCES listings(id),platform text NOT NULL CHECK(platform IN ('instagram','facebook')),caption text NOT NULL,status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','ready','published')),created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS admin_android_releases (id uuid PRIMARY KEY,version_name text NOT NULL,version_code integer NOT NULL,release_notes text NOT NULL,apk_url text,channel text NOT NULL DEFAULT 'internal',created_at timestamptz NOT NULL DEFAULT now());
`;
for(const statement of sql.split(";").map(s=>s.trim()).filter(Boolean))await query(statement);
