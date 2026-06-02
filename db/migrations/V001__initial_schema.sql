-- TOPIK Myanmar — initial schema v0.1
-- PostgreSQL 15+
-- Source: docs/기능정의서/DB스키마_초안.md

BEGIN;

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- users (§4.1)
-- ---------------------------------------------------------------------------
CREATE TABLE users (
    id                  BIGSERIAL PRIMARY KEY,
    email               VARCHAR(255) NOT NULL UNIQUE,
    password_hash       VARCHAR(255),
    signup_provider     VARCHAR(16) NOT NULL DEFAULT 'email',
    provider_uid        VARCHAR(128),
    name_ko             VARCHAR(50) NOT NULL,
    name_en             VARCHAR(80) NOT NULL,
    birth_date          CHAR(8) NOT NULL,
    gender              CHAR(1) NOT NULL,
    nationality         VARCHAR(50) NOT NULL,
    first_language      VARCHAR(50) NOT NULL,
    phone               VARCHAR(32) NOT NULL,
    passport_no         VARCHAR(32),
    job_code            SMALLINT NOT NULL,
    motive_code         SMALLINT NOT NULL,
    purpose_code        SMALLINT NOT NULL,
    photo_file_id       BIGINT,
    preferred_lang      CHAR(2) NOT NULL DEFAULT 'ko',
    marketing_opt_in    BOOLEAN NOT NULL DEFAULT false,
    password_changed_at TIMESTAMPTZ,
    status              VARCHAR(16) NOT NULL,
    rev                 INTEGER NOT NULL DEFAULT 1,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    withdrawn_at        TIMESTAMPTZ,
    CONSTRAINT users_signup_provider_chk CHECK (signup_provider IN ('email', 'google')),
    CONSTRAINT users_gender_chk CHECK (gender IN ('1', '2')),
    CONSTRAINT users_preferred_lang_chk CHECK (preferred_lang IN ('ko', 'my', 'en')),
    CONSTRAINT users_status_chk CHECK (status IN ('active', 'suspended', 'withdrawn'))
);

CREATE INDEX idx_users_status_created_at ON users (status, created_at);
CREATE INDEX idx_users_name_en ON users (name_en);

-- ---------------------------------------------------------------------------
-- file_attachments (§4.16) — before users.photo FK
-- ---------------------------------------------------------------------------
CREATE TABLE file_attachments (
    id                  BIGSERIAL PRIMARY KEY,
    owner_type          VARCHAR(24) NOT NULL,
    owner_id            BIGINT NOT NULL,
    storage_key         VARCHAR(512) NOT NULL,
    original_filename   VARCHAR(255) NOT NULL,
    mime_type           VARCHAR(64) NOT NULL,
    size_bytes          INTEGER NOT NULL,
    checksum_sha256     CHAR(64),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT file_attachments_owner_type_chk CHECK (
        owner_type IN ('user_photo', 'board', 'notice')
    )
);

ALTER TABLE users
    ADD CONSTRAINT users_photo_file_id_fk
    FOREIGN KEY (photo_file_id) REFERENCES file_attachments (id);

-- ---------------------------------------------------------------------------
-- country_region_codes (§4.3)
-- ---------------------------------------------------------------------------
CREATE TABLE country_region_codes (
    country_code        CHAR(3) NOT NULL,
    region_code         CHAR(3) NOT NULL,
    name_ko             VARCHAR(100) NOT NULL,
    name_en             VARCHAR(120) NOT NULL,
    PRIMARY KEY (country_code, region_code)
);

-- ---------------------------------------------------------------------------
-- exam_venues (§4.4)
-- ---------------------------------------------------------------------------
CREATE TABLE exam_venues (
    id                  BIGSERIAL PRIMARY KEY,
    venue_code          CHAR(2) NOT NULL UNIQUE,
    name_ko             VARCHAR(100) NOT NULL,
    name_en             VARCHAR(120),
    address             TEXT,
    country_code        CHAR(3) NOT NULL DEFAULT '025',
    region_code         CHAR(3) NOT NULL,
    capacity            INTEGER NOT NULL,
    note                TEXT,
    is_active           BOOLEAN NOT NULL DEFAULT true,
    rev                 INTEGER NOT NULL DEFAULT 1,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT exam_venues_country_region_fk
        FOREIGN KEY (country_code, region_code)
        REFERENCES country_region_codes (country_code, region_code)
);

CREATE INDEX idx_exam_venues_country_region_active
    ON exam_venues (country_code, region_code, is_active);

-- ---------------------------------------------------------------------------
-- exam_rounds (§4.2)
-- ---------------------------------------------------------------------------
CREATE TABLE exam_rounds (
    id                          BIGSERIAL PRIMARY KEY,
    round_no                    SMALLINT NOT NULL UNIQUE,
    title                       VARCHAR(100) NOT NULL,
    exam_date                   DATE NOT NULL,
    registration_start_at       TIMESTAMPTZ NOT NULL,
    registration_end_at         TIMESTAMPTZ NOT NULL,
    result_announcement_date      DATE,
    fee_level_i                 DECIMAL(12, 2),
    fee_level_ii                DECIMAL(12, 2),
    capacity                    INTEGER,
    registration_status         VARCHAR(16) NOT NULL,
    exam_number_visible_at      TIMESTAMPTZ,
    is_active                   BOOLEAN NOT NULL DEFAULT true,
    rev                         INTEGER NOT NULL DEFAULT 1,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT exam_rounds_registration_status_chk CHECK (
        registration_status IN ('scheduled', 'open', 'closed')
    )
);

CREATE INDEX idx_exam_rounds_registration_status_end
    ON exam_rounds (registration_status, registration_end_at);

-- ---------------------------------------------------------------------------
-- exam_round_venues (§4.5)
-- ---------------------------------------------------------------------------
CREATE TABLE exam_round_venues (
    exam_round_id       BIGINT NOT NULL REFERENCES exam_rounds (id) ON DELETE CASCADE,
    exam_venue_id       BIGINT NOT NULL REFERENCES exam_venues (id) ON DELETE RESTRICT,
    PRIMARY KEY (exam_round_id, exam_venue_id)
);

-- ---------------------------------------------------------------------------
-- application_submissions (§4.6)
-- ---------------------------------------------------------------------------
CREATE TABLE application_submissions (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    exam_round_id       BIGINT NOT NULL REFERENCES exam_rounds (id) ON DELETE RESTRICT,
    submitted_at        TIMESTAMPTZ,
    terms_snapshot      JSONB,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, exam_round_id)
);

-- ---------------------------------------------------------------------------
-- applications (§4.7)
-- ---------------------------------------------------------------------------
CREATE TABLE applications (
    id                      BIGSERIAL PRIMARY KEY,
    submission_id           BIGINT NOT NULL REFERENCES application_submissions (id) ON DELETE RESTRICT,
    user_id                 BIGINT NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    exam_round_id           BIGINT NOT NULL REFERENCES exam_rounds (id) ON DELETE RESTRICT,
    exam_level              VARCHAR(2) NOT NULL,
    exam_venue_id           BIGINT NOT NULL REFERENCES exam_venues (id) ON DELETE RESTRICT,
    application_no          VARCHAR(24) NOT NULL UNIQUE,
    exam_number             CHAR(13) UNIQUE,
    status                  VARCHAR(24) NOT NULL,
    photo_review_status     VARCHAR(16) NOT NULL,
    photo_reject_code       VARCHAR(32),
    photo_reject_note       TEXT,
    payment_status          VARCHAR(16) NOT NULL,
    paid_at                 TIMESTAMPTZ,
    payment_memo            TEXT,
    receipt_no              VARCHAR(64),
    reject_code             VARCHAR(32),
    reject_note             TEXT,
    cancelled_at            TIMESTAMPTZ,
    cancel_reason           TEXT,
    profile_snapshot        JSONB NOT NULL DEFAULT '{}',
    photo_file_id           BIGINT REFERENCES file_attachments (id),
    rev                     INTEGER NOT NULL DEFAULT 1,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT applications_exam_level_chk CHECK (exam_level IN ('I', 'II')),
    CONSTRAINT applications_status_chk CHECK (
        status IN (
            'submitted', 'photo_review', 'payment_pending',
            'approved', 'exam_number_assigned', 'rejected', 'cancelled'
        )
    ),
    CONSTRAINT applications_photo_review_status_chk CHECK (
        photo_review_status IN ('pending', 'approved', 'rejected')
    ),
    CONSTRAINT applications_payment_status_chk CHECK (
        payment_status IN ('unpaid', 'paid', 'refunded')
    )
);

CREATE UNIQUE INDEX idx_applications_user_round_level_active
    ON applications (user_id, exam_round_id, exam_level)
    WHERE status <> 'cancelled';

CREATE INDEX idx_applications_exam_round_status ON applications (exam_round_id, status);
CREATE INDEX idx_applications_exam_round_venue_status
    ON applications (exam_round_id, exam_venue_id, status);
CREATE INDEX idx_applications_exam_number
    ON applications (exam_number)
    WHERE exam_number IS NOT NULL;
CREATE INDEX idx_applications_user_exam_round ON applications (user_id, exam_round_id);

-- ---------------------------------------------------------------------------
-- exam_number_sequences (§4.8, §4.18)
-- ---------------------------------------------------------------------------
CREATE TABLE exam_number_sequences (
    exam_round_id       BIGINT NOT NULL REFERENCES exam_rounds (id) ON DELETE RESTRICT,
    exam_venue_id       BIGINT NOT NULL REFERENCES exam_venues (id) ON DELETE RESTRICT,
    exam_level          VARCHAR(2) NOT NULL,
    last_serial         INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (exam_round_id, exam_venue_id, exam_level),
    CONSTRAINT exam_number_sequences_exam_level_chk CHECK (exam_level IN ('I', 'II'))
);

-- ---------------------------------------------------------------------------
-- admin_users (§4.9)
-- ---------------------------------------------------------------------------
CREATE TABLE admin_users (
    id                  BIGSERIAL PRIMARY KEY,
    name                VARCHAR(50) NOT NULL,
    email               VARCHAR(255) NOT NULL UNIQUE,
    password_hash       VARCHAR(255) NOT NULL,
    role                VARCHAR(16) NOT NULL,
    is_active           BOOLEAN NOT NULL DEFAULT true,
    last_login_at       TIMESTAMPTZ,
    rev                 INTEGER NOT NULL DEFAULT 1,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT admin_users_role_chk CHECK (role IN ('super', 'standard', 'readonly'))
);

-- ---------------------------------------------------------------------------
-- admin_audit_logs (§4.10)
-- ---------------------------------------------------------------------------
CREATE TABLE admin_audit_logs (
    id                  BIGSERIAL PRIMARY KEY,
    admin_user_id       BIGINT NOT NULL REFERENCES admin_users (id) ON DELETE RESTRICT,
    target_table        VARCHAR(64) NOT NULL,
    target_id           BIGINT NOT NULL,
    action              VARCHAR(32) NOT NULL,
    status_before       VARCHAR(32),
    status_after        VARCHAR(32),
    memo                TEXT,
    payload             JSONB,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_audit_logs_target ON admin_audit_logs (target_table, target_id);
CREATE INDEX idx_admin_audit_logs_created_at ON admin_audit_logs (created_at DESC);

-- ---------------------------------------------------------------------------
-- notices (§4.11)
-- ---------------------------------------------------------------------------
CREATE TABLE notices (
    id                  BIGSERIAL PRIMARY KEY,
    category            VARCHAR(16) NOT NULL,
    title               VARCHAR(200) NOT NULL,
    body_html           TEXT NOT NULL DEFAULT '',
    is_published        BOOLEAN NOT NULL DEFAULT false,
    is_pinned           BOOLEAN NOT NULL DEFAULT false,
    view_count          INTEGER NOT NULL DEFAULT 0,
    author_admin_id     BIGINT REFERENCES admin_users (id),
    published_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT notices_category_chk CHECK (
        category IN ('important', 'registration', 'exam', 'result')
    )
);

-- ---------------------------------------------------------------------------
-- board_posts (§4.12)
-- ---------------------------------------------------------------------------
CREATE TABLE board_posts (
    id                      BIGSERIAL PRIMARY KEY,
    board_type              VARCHAR(24) NOT NULL,
    user_id                 BIGINT NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    category                VARCHAR(16),
    post_type               VARCHAR(16),
    title                   VARCHAR(100) NOT NULL,
    body                    TEXT NOT NULL,
    is_secret               BOOLEAN NOT NULL DEFAULT false,
    secret_password_hash    VARCHAR(255),
    workflow_status         VARCHAR(16) NOT NULL,
    admin_reply             TEXT,
    admin_replied_at        TIMESTAMPTZ,
    admin_replier_id        BIGINT REFERENCES admin_users (id),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT board_posts_board_type_chk CHECK (
        board_type IN ('refund_correction', 'inquiry')
    ),
    CONSTRAINT board_posts_workflow_status_chk CHECK (
        workflow_status IN (
            'received', 'in_review', 'completed', 'rejected',
            'awaiting_reply', 'answered'
        )
    )
);

-- ---------------------------------------------------------------------------
-- board_comments (§4.13)
-- ---------------------------------------------------------------------------
CREATE TABLE board_comments (
    id                  BIGSERIAL PRIMARY KEY,
    board_post_id       BIGINT NOT NULL REFERENCES board_posts (id) ON DELETE CASCADE,
    parent_comment_id   BIGINT REFERENCES board_comments (id) ON DELETE CASCADE,
    author_user_id      BIGINT REFERENCES users (id),
    author_admin_id     BIGINT REFERENCES admin_users (id),
    body                TEXT NOT NULL,
    is_secret           BOOLEAN NOT NULL DEFAULT false,
    is_deleted          BOOLEAN NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- faq_items (§4.14)
-- ---------------------------------------------------------------------------
CREATE TABLE faq_items (
    id                  BIGSERIAL PRIMARY KEY,
    category            VARCHAR(16) NOT NULL,
    sort_order          INTEGER NOT NULL DEFAULT 0,
    question_ko         TEXT NOT NULL,
    question_my         TEXT,
    question_en         TEXT,
    answer_ko           TEXT NOT NULL,
    answer_my           TEXT,
    answer_en           TEXT,
    is_active           BOOLEAN NOT NULL DEFAULT true,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- terms / term_agreements (§4.15)
-- ---------------------------------------------------------------------------
CREATE TABLE terms (
    id                  BIGSERIAL PRIMARY KEY,
    term_type           VARCHAR(24) NOT NULL,
    version             VARCHAR(16) NOT NULL,
    body_ko             TEXT NOT NULL,
    body_my             TEXT,
    body_en             TEXT,
    effective_at        TIMESTAMPTZ NOT NULL,
    status              VARCHAR(16) NOT NULL,
    CONSTRAINT terms_term_type_chk CHECK (
        term_type IN ('service', 'privacy', 'marketing')
    ),
    CONSTRAINT terms_status_chk CHECK (status IN ('draft', 'published', 'retired')),
    UNIQUE (term_type, version)
);

CREATE TABLE term_agreements (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    term_id             BIGINT NOT NULL REFERENCES terms (id) ON DELETE RESTRICT,
    agreed_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address          INET,
    user_agent          TEXT,
    UNIQUE (user_id, term_id)
);

-- ---------------------------------------------------------------------------
-- email_outbox (§4.17)
-- ---------------------------------------------------------------------------
CREATE TABLE email_outbox (
    id                  BIGSERIAL PRIMARY KEY,
    template_key        VARCHAR(64) NOT NULL,
    locale              CHAR(2) NOT NULL,
    to_email            VARCHAR(255) NOT NULL,
    user_id             BIGINT REFERENCES users (id),
    subject             VARCHAR(255) NOT NULL,
    body_html           TEXT NOT NULL,
    status              VARCHAR(16) NOT NULL DEFAULT 'queued',
    retry_count         SMALLINT NOT NULL DEFAULT 0,
    related_table       VARCHAR(64),
    related_id          BIGINT,
    sent_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT email_outbox_locale_chk CHECK (locale IN ('ko', 'my', 'en')),
    CONSTRAINT email_outbox_status_chk CHECK (status IN ('queued', 'sent', 'failed'))
);

-- ---------------------------------------------------------------------------
-- Auxiliary tables (§4.18)
-- ---------------------------------------------------------------------------
CREATE TABLE email_verification_codes (
    id                  BIGSERIAL PRIMARY KEY,
    email               VARCHAR(255) NOT NULL,
    code                CHAR(6) NOT NULL,
    expires_at          TIMESTAMPTZ NOT NULL,
    consumed_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_verification_codes_email_expires
    ON email_verification_codes (email, expires_at);

CREATE TABLE password_reset_tokens (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash          VARCHAR(255) NOT NULL,
    expires_at          TIMESTAMPTZ NOT NULL,
    consumed_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_password_reset_tokens_user_expires
    ON password_reset_tokens (user_id, expires_at);

CREATE TABLE user_sessions (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    session_token_hash  VARCHAR(255) NOT NULL UNIQUE,
    expires_at          TIMESTAMPTZ NOT NULL,
    ip_address          INET,
    user_agent          TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions (user_id);

CREATE TABLE notice_view_logs (
    id                  BIGSERIAL PRIMARY KEY,
    notice_id           BIGINT NOT NULL REFERENCES notices (id) ON DELETE CASCADE,
    session_key         VARCHAR(64) NOT NULL,
    viewed_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (notice_id, session_key)
);

COMMIT;
