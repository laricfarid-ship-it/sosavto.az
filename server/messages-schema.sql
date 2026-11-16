CREATE TABLE IF NOT EXISTS conversations (
 id uuid PRIMARY KEY, kind text NOT NULL CHECK(kind IN ('listing','support')),
 buyer_id uuid NOT NULL REFERENCES users(id), seller_id uuid REFERENCES users(id),
 listing_id uuid REFERENCES listings(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK((kind='support' AND seller_id IS NULL) OR (kind='listing' AND seller_id IS NOT NULL AND buyer_id<>seller_id))
);
CREATE UNIQUE INDEX IF NOT EXISTS conversations_listing_unique ON conversations(buyer_id,listing_id) WHERE kind='listing';
CREATE UNIQUE INDEX IF NOT EXISTS conversations_support_unique ON conversations(buyer_id) WHERE kind='support';
CREATE TABLE IF NOT EXISTS conversation_messages (
 id uuid PRIMARY KEY, conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
 sender_id uuid NOT NULL REFERENCES users(id), body varchar(2000) NOT NULL CHECK(length(trim(body)) BETWEEN 1 AND 2000),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS conversation_messages_history ON conversation_messages(conversation_id,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS conversations_buyer ON conversations(buyer_id);
CREATE INDEX IF NOT EXISTS conversations_seller ON conversations(seller_id);
