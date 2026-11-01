-- SosAvto service directory: isolated, additive schema.
-- Run only after reviewing database migration strategy; no production migration is executed here.
CREATE TABLE IF NOT EXISTS service_businesses (
  id UUID PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  category VARCHAR(40) NOT NULL CHECK (category IN ('wash','detailing','repair','parts','tyres','electrical','bodywork','roadside')),
  city VARCHAR(100) NOT NULL,
  district VARCHAR(120),
  address TEXT,
  latitude DOUBLE PRECISION CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION CHECK (longitude BETWEEN -180 AND 180),
  phone VARCHAR(40),
  website TEXT,
  source_name VARCHAR(100) NOT NULL,
  source_id VARCHAR(180),
  source_url TEXT,
  source_license TEXT,
  verified_at TIMESTAMPTZ,
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ownership_status VARCHAR(24) NOT NULL DEFAULT 'unclaimed' CHECK (ownership_status IN ('unclaimed','pending','verified','rejected')),
  publication_status VARCHAR(24) NOT NULL DEFAULT 'draft' CHECK (publication_status IN ('draft','pending_review','published','suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT service_businesses_source_unique UNIQUE (source_name, source_id)
);
CREATE INDEX IF NOT EXISTS service_businesses_public_search_idx ON service_businesses (publication_status, city, category);
CREATE INDEX IF NOT EXISTS service_businesses_owner_idx ON service_businesses (owner_user_id);
CREATE TABLE IF NOT EXISTS service_business_claims (
  id UUID PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES service_businesses(id) ON DELETE CASCADE,
  claimant_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(24) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  evidence_note TEXT,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS service_business_claims_review_idx ON service_business_claims(status,created_at);
