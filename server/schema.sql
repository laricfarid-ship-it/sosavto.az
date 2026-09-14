CREATE TABLE IF NOT EXISTS users (
 id uuid PRIMARY KEY, fullname text NOT NULL, username text NOT NULL UNIQUE, email text NOT NULL UNIQUE,
 phone text NOT NULL DEFAULT '', password_hash text NOT NULL, role text NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')),
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','banned')), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS listings (
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), category text NOT NULL,
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
CREATE TABLE IF NOT EXISTS ai_daily_usage (
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 day date NOT NULL, images integer NOT NULL DEFAULT 0, texts integer NOT NULL DEFAULT 0,
 PRIMARY KEY(user_id,day)
);
CREATE TABLE IF NOT EXISTS ai_image_threads (
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 day date NOT NULL, remaining integer NOT NULL CHECK(remaining>=0)
);
CREATE TABLE IF NOT EXISTS ai_budget_usage (
 bucket text PRIMARY KEY, reserved_cents bigint NOT NULL DEFAULT 0 CHECK(reserved_cents>=0)
);
CREATE TABLE IF NOT EXISTS ai_requests (
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 thread_id uuid REFERENCES ai_image_threads(id), model text NOT NULL,
 reserved_cents integer NOT NULL, status text NOT NULL DEFAULT 'reserved',
 created_at timestamptz NOT NULL DEFAULT now()
);
