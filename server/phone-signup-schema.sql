-- Preserve existing email identities. Phone signups have no fabricated email address.
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
CREATE TABLE IF NOT EXISTS login_phones (
 user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 phone text NOT NULL UNIQUE CHECK (phone ~ '^\+994[0-9]{9}$')
);
