CREATE TABLE IF NOT EXISTS car_analyses (
 id uuid PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 client_key uuid NOT NULL,
 fingerprint text NOT NULL,
 model text NOT NULL,
 prompt_version text NOT NULL,
 status text NOT NULL CHECK(status IN ('pending','complete','error')),
 result jsonb,
 raw_output text,
 usage jsonb,
 estimated_cost_usd numeric(14,8),
 error_code text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,client_key)
);
CREATE INDEX IF NOT EXISTS car_analyses_owner ON car_analyses(user_id,created_at);
