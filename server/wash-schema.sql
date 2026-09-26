BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '20s';
SET LOCAL search_path TO public;
CREATE TABLE IF NOT EXISTS wash_shops (
 id uuid PRIMARY KEY REFERENCES listings(id), owner_id uuid NOT NULL REFERENCES users(id),
 services jsonb NOT NULL, cash_enabled boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS wash_slots (
 id uuid PRIMARY KEY, shop_id uuid NOT NULL REFERENCES wash_shops(id), starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL,
 capacity integer NOT NULL CHECK(capacity BETWEEN 1 AND 20), blocked integer NOT NULL DEFAULT 0 CHECK(blocked>=0 AND blocked<=capacity),
 closed boolean NOT NULL DEFAULT false, updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(ends_at>starts_at), UNIQUE(shop_id,starts_at)
);
CREATE TABLE IF NOT EXISTS wash_bookings (
 id uuid PRIMARY KEY, slot_id uuid NOT NULL REFERENCES wash_slots(id), customer_id uuid NOT NULL REFERENCES users(id),
 client_key uuid NOT NULL, request_hash text NOT NULL,
 status text NOT NULL CHECK(status IN ('held','confirmed','arrived','completed','cancelled','expired')),
 method text NOT NULL CHECK(method IN ('cash','card')), payment_status text NOT NULL DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid','paid','refund_pending','refunded')),
 expires_at timestamptz NOT NULL, snapshot jsonb NOT NULL, total_cents integer NOT NULL CHECK(total_cents>0),
 phone text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(customer_id,client_key)
);
CREATE INDEX IF NOT EXISTS wash_slots_shop_time ON wash_slots(shop_id,starts_at);
CREATE INDEX IF NOT EXISTS wash_booking_slot_state ON wash_bookings(slot_id,status,expires_at);
CREATE INDEX IF NOT EXISTS wash_booking_customer ON wash_bookings(customer_id,created_at);
CREATE TABLE IF NOT EXISTS wash_reviews (
 booking_id uuid PRIMARY KEY REFERENCES wash_bookings(id), rating integer NOT NULL CHECK(rating BETWEEN 1 AND 5),
 comment text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS wash_events (
 id uuid PRIMARY KEY, booking_id uuid NOT NULL REFERENCES wash_bookings(id), actor_id uuid NOT NULL REFERENCES users(id),
 action text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS wash_zones (id uuid PRIMARY KEY,name text NOT NULL,ring jsonb NOT NULL,updated_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE wash_shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE wash_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE wash_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE wash_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE wash_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE wash_zones ENABLE ROW LEVEL SECURITY;
COMMIT;
