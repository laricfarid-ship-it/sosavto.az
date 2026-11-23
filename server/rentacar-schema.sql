-- Additive, explicit migration only. Never renames or updates insurance records.
CREATE TABLE IF NOT EXISTS rental_profiles (
 user_id uuid PRIMARY KEY REFERENCES users(id),
 kind text NOT NULL CHECK(kind IN ('company','individual')),
 name varchar(120) NOT NULL, city varchar(80) NOT NULL,
 phone varchar(25) NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 review_note varchar(500) NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS rental_cars (
 id uuid PRIMARY KEY, listing_number bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
 owner_id uuid NOT NULL REFERENCES rental_profiles(user_id),
 title varchar(120) NOT NULL, city varchar(80) NOT NULL,
 vehicle_type text NOT NULL CHECK(vehicle_type IN ('economy','sedan','suv','premium')),
 year integer NOT NULL CHECK(year BETWEEN 1900 AND 2100),
 images jsonb NOT NULL CHECK(jsonb_typeof(images)='array'),
 daily_cents integer NOT NULL CHECK(daily_cents>0),
 weekly_cents integer NOT NULL CHECK(weekly_cents>0),
 monthly_cents integer NOT NULL CHECK(monthly_cents>0),
 deposit_cents integer NOT NULL CHECK(deposit_cents>=0),
 terms varchar(3000) NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','rejected','archived')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS rental_bookings (
 id uuid PRIMARY KEY, car_id uuid NOT NULL REFERENCES rental_cars(id),
 renter_id uuid NOT NULL REFERENCES users(id),
 starts_on date NOT NULL, ends_on date NOT NULL CHECK(ends_on>starts_on),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','rejected','cancelled','completed')),
 total_cents integer NOT NULL CHECK(total_cents>0),
 snapshot jsonb NOT NULL,
 client_key uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(renter_id,client_key)
);
CREATE INDEX IF NOT EXISTS rental_booking_dates ON rental_bookings(car_id,starts_on,ends_on) WHERE status='confirmed';
CREATE TABLE IF NOT EXISTS rental_audit (
 id uuid PRIMARY KEY, actor_id uuid NOT NULL REFERENCES users(id),
 action text NOT NULL, subject_id uuid NOT NULL,
 detail jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE rental_bookings ADD COLUMN IF NOT EXISTS renter_phone varchar(25) NOT NULL DEFAULT '';
CREATE TABLE IF NOT EXISTS rental_media (
 id uuid PRIMARY KEY,owner_id uuid NOT NULL REFERENCES users(id),
 car_id uuid REFERENCES rental_cars(id),url text NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rental_cars_owner ON rental_cars(owner_id,created_at DESC);
CREATE INDEX IF NOT EXISTS rental_bookings_renter ON rental_bookings(renter_id,created_at DESC);

CREATE TABLE IF NOT EXISTS rental_finance_settings (
 id integer PRIMARY KEY CHECK(id=1), commission_bps integer NOT NULL DEFAULT 0 CHECK(commission_bps BETWEEN 0 AND 10000),
 configured boolean NOT NULL DEFAULT false, updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO rental_finance_settings(id) VALUES(1) ON CONFLICT DO NOTHING;
ALTER TABLE rental_bookings ADD COLUMN IF NOT EXISTS commission_bps integer NOT NULL DEFAULT 0 CHECK(commission_bps BETWEEN 0 AND 10000);
ALTER TABLE rental_bookings ADD COLUMN IF NOT EXISTS commission_cents integer NOT NULL DEFAULT 0 CHECK(commission_cents>=0);
ALTER TABLE rental_bookings ADD COLUMN IF NOT EXISTS commission_configured boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS rental_commission_receipts (
 id uuid PRIMARY KEY,booking_id uuid NOT NULL UNIQUE REFERENCES rental_bookings(id),
 amount_cents integer NOT NULL CHECK(amount_cents>0),reference varchar(150) NOT NULL UNIQUE,
 actor_id uuid NOT NULL REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now()
);
