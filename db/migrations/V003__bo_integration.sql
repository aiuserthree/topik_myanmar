-- TOPIK Myanmar — V003: BO integration (mock → real data)
-- Additive + idempotent (ADD COLUMN / CREATE TABLE ... IF NOT EXISTS) so it is
-- safe to re-run on every migrate, including on a fresh V001 install.
--
-- Adds:
--   1) application_memos   — 접수 건 관리자 메모(이력) for BO 접수자 상세
--   2) exam_rounds.payment_start_at / payment_end_at — BO가 설정하는 응시료 납부 기간
--      (FO 메인 페이지 D-day 위젯이 하드코딩 대신 이 값을 표기)

BEGIN;

-- ---------------------------------------------------------------------------
-- application_memos — per-applicant admin memo history
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS application_memos (
    id              BIGSERIAL PRIMARY KEY,
    application_id  BIGINT NOT NULL REFERENCES applications (id) ON DELETE CASCADE,
    admin_user_id   BIGINT NOT NULL REFERENCES admin_users (id) ON DELETE RESTRICT,
    body            TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_application_memos_application
    ON application_memos (application_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- exam_rounds — 응시료 납부 기간 (registration 기간과 별개로 BO에서 설정)
-- ---------------------------------------------------------------------------
ALTER TABLE exam_rounds
    ADD COLUMN IF NOT EXISTS payment_start_at TIMESTAMPTZ;
ALTER TABLE exam_rounds
    ADD COLUMN IF NOT EXISTS payment_end_at TIMESTAMPTZ;

COMMIT;
