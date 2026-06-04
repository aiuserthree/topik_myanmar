-- TOPIK Myanmar — V004: FO member last login timestamp
-- Additive + idempotent for Railway migrate on boot.

BEGIN;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

COMMIT;
