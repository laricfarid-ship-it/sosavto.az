CREATE TABLE IF NOT EXISTS admin_push_subscriptions (
 endpoint text PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 subscription jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_push_user ON admin_push_subscriptions(user_id);
