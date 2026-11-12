CREATE TABLE IF NOT EXISTS users (
 id uuid PRIMARY KEY, fullname text NOT NULL, username text NOT NULL UNIQUE, email text NOT NULL UNIQUE,
 phone text NOT NULL DEFAULT '', password_hash text NOT NULL, role text NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')),
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','banned')), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at timestamptz NOT NULL);
CREATE SEQUENCE IF NOT EXISTS listing_numbers START WITH 100001;
CREATE TABLE IF NOT EXISTS listings (
 id uuid PRIMARY KEY, listing_number bigint NOT NULL DEFAULT nextval('listing_numbers') UNIQUE, user_id uuid NOT NULL REFERENCES users(id), category text NOT NULL,
 title text NOT NULL, description text NOT NULL, price numeric(12,2) NOT NULL CHECK(price>=0), city text NOT NULL,
 brand text NOT NULL DEFAULT '', model text NOT NULL DEFAULT '', year integer, mileage integer,
 phone text NOT NULL, address text NOT NULL DEFAULT '', latitude double precision, longitude double precision,
 details jsonb NOT NULL DEFAULT '{}', status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','rejected','sold','archived')),
 rejection_reason text NOT NULL DEFAULT '', views integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS images (id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), listing_id uuid REFERENCES listings(id) ON DELETE CASCADE, url text NOT NULL, sort_order integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS favorites (user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,listing_id));
CREATE TABLE IF NOT EXISTS reports (id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE, reason text NOT NULL, status text NOT NULL DEFAULT 'open', created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS notifications (id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, body text NOT NULL, read_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS audit_logs (id uuid PRIMARY KEY, admin_id uuid NOT NULL REFERENCES users(id), action text NOT NULL, entity_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS rate_limits (key text PRIMARY KEY, hits integer NOT NULL, expires_at timestamptz NOT NULL);
CREATE INDEX IF NOT EXISTS listings_search ON listings(status,category,city,brand,year,price);
CREATE INDEX IF NOT EXISTS listings_owner ON listings(user_id,created_at);
CREATE INDEX IF NOT EXISTS images_listing ON images(listing_id,sort_order);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS password_resets (
 token_hash text PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS password_resets_user ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS password_resets_expiry ON password_resets(expires_at);

CREATE TABLE IF NOT EXISTS admin_totp (
 user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 secret text NOT NULL,
 enabled boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS admin_login_challenges (
 token_hash text PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS admin_login_challenges_expiry ON admin_login_challenges(expires_at);

CREATE TABLE IF NOT EXISTS admin_totp_backup_codes (
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 code_hash text NOT NULL UNIQUE,
 used_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,code_hash)
);
CREATE INDEX IF NOT EXISTS admin_totp_backup_user ON admin_totp_backup_codes(user_id,used_at);

CREATE TABLE IF NOT EXISTS admin_push_subscriptions (
 endpoint text PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 subscription jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_push_user ON admin_push_subscriptions(user_id);

-- Public profiles exist only for admin-approved dealerships.
-- Ordinary users have no public profile record or public profile URL.
CREATE TABLE IF NOT EXISTS dealership_profiles (
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
);
CREATE INDEX IF NOT EXISTS dealership_profiles_public ON dealership_profiles(status,slug);

CREATE TABLE IF NOT EXISTS admin_finance_entries (
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

-- Additive: keep any stories created by the earlier stories branch.
CREATE TABLE IF NOT EXISTS stories (
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 media_url text NOT NULL, media_type text NOT NULL DEFAULT 'image' CHECK(media_type IN ('image','video')),
 caption varchar(280) NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT (now()+interval '24 hours')
);
ALTER TABLE stories ADD COLUMN IF NOT EXISTS listing_id uuid REFERENCES listings(id) ON DELETE SET NULL;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'midnight';
ALTER TABLE stories ADD COLUMN IF NOT EXISTS media_key text;
CREATE INDEX IF NOT EXISTS stories_live ON stories(expires_at,created_at DESC);
CREATE INDEX IF NOT EXISTS stories_owner ON stories(user_id,expires_at);
-- Separate ledger: deleting a story does not reset the daily allowance.
CREATE TABLE IF NOT EXISTS story_daily_posts (
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, day date NOT NULL,
 PRIMARY KEY(user_id,day)
);
INSERT INTO story_daily_posts(user_id,day)
 SELECT DISTINCT user_id,(created_at AT TIME ZONE 'Asia/Baku')::date FROM stories
 ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS story_reports (
 story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 reason varchar(300) NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(story_id,user_id)
);
