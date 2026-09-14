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
