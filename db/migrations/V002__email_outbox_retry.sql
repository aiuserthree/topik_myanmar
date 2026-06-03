-- TOPIK Myanmar — V002: email_outbox async retry support
-- Additive + idempotent (safe to re-run). retry_count already exists in V001;
-- this only adds last_error and a draining index used by the email worker.

BEGIN;

ALTER TABLE email_outbox
    ADD COLUMN IF NOT EXISTS last_error TEXT;

-- Speeds up the worker's "pick up queued/failed rows" scan.
CREATE INDEX IF NOT EXISTS idx_email_outbox_status_id
    ON email_outbox (status, id);

COMMIT;
