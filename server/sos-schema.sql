-- Apply only to an isolated test database until release approval.
CREATE TABLE IF NOT EXISTS sos_masters (
 user_id uuid PRIMARY KEY REFERENCES users(id), phone text NOT NULL,
 specialties text[] NOT NULL, approval text NOT NULL DEFAULT 'pending' CHECK(approval IN ('pending','approved','rejected')),
 online boolean NOT NULL DEFAULT false, latitude double precision CHECK(latitude BETWEEN -90 AND 90),
 longitude double precision CHECK(longitude BETWEEN -180 AND 180), location_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sos_requests (
 id uuid PRIMARY KEY, driver_id uuid NOT NULL REFERENCES users(id), client_key uuid NOT NULL,
 problem text NOT NULL CHECK(problem IN ('tire','battery','fuel','engine','accident','other')),
 latitude double precision NOT NULL CHECK(latitude BETWEEN -90 AND 90), longitude double precision NOT NULL CHECK(longitude BETWEEN -180 AND 180),
 address text NOT NULL, note text NOT NULL DEFAULT '', phone text NOT NULL,
 status text NOT NULL DEFAULT 'searching' CHECK(status IN ('searching','offered','en_route','arrived','completed','cancelled','expired')),
 master_id uuid REFERENCES sos_masters(user_id), arrival_fee numeric(10,2), labor_fee numeric(10,2), parts_fee numeric(10,2), eta_minutes integer,
 cancellation_reason text, confirmed_at timestamptz, expires_at timestamptz NOT NULL DEFAULT now()+interval '5 minutes',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(driver_id,client_key), CHECK(master_id IS NULL OR master_id<>driver_id),
 CHECK(arrival_fee>=0 AND labor_fee>=0 AND parts_fee>=0), CHECK(eta_minutes BETWEEN 1 AND 240)
);
CREATE UNIQUE INDEX IF NOT EXISTS sos_one_driver ON sos_requests(driver_id) WHERE status IN ('searching','offered','en_route','arrived');
CREATE UNIQUE INDEX IF NOT EXISTS sos_one_master ON sos_requests(master_id) WHERE status IN ('offered','en_route','arrived');
CREATE INDEX IF NOT EXISTS sos_expiry ON sos_requests(expires_at) WHERE status IN ('searching','offered');
CREATE TABLE IF NOT EXISTS sos_dispatches (
 request_id uuid NOT NULL REFERENCES sos_requests(id), master_id uuid NOT NULL REFERENCES sos_masters(user_id),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','declined','closed')),
 distance_km double precision NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(request_id,master_id)
);
CREATE INDEX IF NOT EXISTS sos_inbox ON sos_dispatches(master_id,status);
CREATE TABLE IF NOT EXISTS sos_events (
 id uuid PRIMARY KEY, request_id uuid NOT NULL REFERENCES sos_requests(id), actor_id uuid REFERENCES users(id),
 status text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sos_reviews (
 request_id uuid PRIMARY KEY REFERENCES sos_requests(id), rating integer NOT NULL CHECK(rating BETWEEN 1 AND 5),
 comment text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now()
);
-- No public browser access. All queries use the server database owner and scoped API checks.
ALTER TABLE sos_masters ENABLE ROW LEVEL SECURITY;
ALTER TABLE sos_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE sos_dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE sos_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sos_reviews ENABLE ROW LEVEL SECURITY;

ALTER TABLE sos_requests ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;
