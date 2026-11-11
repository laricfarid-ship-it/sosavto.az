import {query} from './db.mjs';
await query(`CREATE TABLE IF NOT EXISTS dealership_profiles (
 id uuid PRIMARY KEY,
 owner_user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
 slug text NOT NULL UNIQUE CHECK(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 display_name text NOT NULL CHECK(length(trim(display_name)) BETWEEN 2 AND 120),
 description text NOT NULL DEFAULT '',
 logo_url text NOT NULL DEFAULT '',
 banner_url text NOT NULL DEFAULT '',
 public_phone text NOT NULL DEFAULT '',
 address text NOT NULL DEFAULT '',
 city text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','suspended')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
)`);
await query('CREATE INDEX IF NOT EXISTS dealership_profiles_public ON dealership_profiles(status,slug)');
