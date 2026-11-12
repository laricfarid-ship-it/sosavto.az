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
