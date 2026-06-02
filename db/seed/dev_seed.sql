-- TOPIK Myanmar — dev seed data v0.1
-- ⚠️ DEV/LOCAL ONLY — do NOT run against production as-is.
-- Source: html/C안/BO(admin)/project/assets/data.js, 정책_합의_워크시트 §2.1 (50,000/75,000 MMK)

BEGIN;

-- ---------------------------------------------------------------------------
-- Country / region codes (Myanmar)
-- ---------------------------------------------------------------------------
INSERT INTO country_region_codes (country_code, region_code, name_ko, name_en) VALUES
    ('025', '001', '양곤', 'Yangon'),
    ('025', '002', '만달레이', 'Mandalay'),
    ('025', '003', '네피도', 'Naypyidaw'),
    ('025', '004', '몽유와', 'Monywa');

-- ---------------------------------------------------------------------------
-- Exam venues (C안 BO mock master)
-- ---------------------------------------------------------------------------
INSERT INTO exam_venues (
    venue_code, name_ko, name_en, address, country_code, region_code,
    capacity, note, is_active
) VALUES
    ('01', '양곤대 흘라잉캠퍼스', 'Yangon Univ. Hlaing Campus',
     'No.1, Pyay Rd, Hlaing Tsp, Yangon', '025', '001', 600,
     '1차 시험 주 시험장. 책임자: U Aung (운영 합의 후 기재)', true),
    ('02', '한국문화원', 'Korean Cultural Center',
     '#3, Min Yegyaw St, Yangon', '025', '001', 240, NULL, true),
    ('03', '만달레이 외국어대학교', 'Mandalay Univ. of Foreign Languages',
     '78th St, Mandalay', '025', '002', 320, NULL, true),
    ('04', '네피도 한국어교육원', 'Naypyidaw Korean Edu. Center',
     'Zabuthiri, Naypyidaw', '025', '003', 180, NULL, true),
    ('05', '몽유와대학교', 'Monywa University',
     'Monywa, Sagaing', '025', '004', 120, '2026-1차 운영 보류', false);

-- ---------------------------------------------------------------------------
-- Exam rounds — 제106회 (open) + closed samples
-- Fees: FO prototype rules-fee (50,000 / 75,000 MMK)
-- ---------------------------------------------------------------------------
INSERT INTO exam_rounds (
    round_no, title, exam_date,
    registration_start_at, registration_end_at, result_announcement_date,
    fee_level_i, fee_level_ii, capacity, registration_status,
    exam_number_visible_at, is_active
) VALUES
    (
        106, '제106회 TOPIK', '2026-09-19',
        '2026-06-01 00:00:00+06:30', '2026-07-26 23:59:59+06:30', '2026-10-20',
        50000.00, 75000.00, 1200, 'open',
        '2026-08-01 09:00:00+06:30', true
    ),
    (
        105, '제105회 TOPIK', '2026-05-09',
        '2026-02-10 00:00:00+06:30', '2026-03-15 23:59:59+06:30', '2026-06-10',
        50000.00, 75000.00, 1000, 'closed', NULL, true
    );

INSERT INTO exam_round_venues (exam_round_id, exam_venue_id)
SELECT r.id, v.id
FROM exam_rounds r
CROSS JOIN exam_venues v
WHERE r.round_no = 106
  AND v.venue_code IN ('01', '02', '03', '04');

INSERT INTO exam_round_venues (exam_round_id, exam_venue_id)
SELECT r.id, v.id
FROM exam_rounds r
CROSS JOIN exam_venues v
WHERE r.round_no = 105
  AND v.venue_code IN ('01', '02', '03');

-- ---------------------------------------------------------------------------
-- Terms (draft v1.0 — placeholder bodies)
-- ---------------------------------------------------------------------------
INSERT INTO terms (term_type, version, body_ko, body_my, body_en, effective_at, status) VALUES
    ('service', 'v1.0', '(서비스 이용약관 초안 — 운영 확정 전)', NULL, NULL,
     '2026-06-01 00:00:00+06:30', 'published'),
    ('privacy', 'v1.0', '(개인정보처리방침 초안 — 운영 확정 전)', NULL, NULL,
     '2026-06-01 00:00:00+06:30', 'published'),
    ('marketing', 'v1.0', '(마케팅 수신 동의 초안)', NULL, NULL,
     '2026-06-01 00:00:00+06:30', 'published');

-- ---------------------------------------------------------------------------
-- Super admin (DEV ONLY)
-- Email: admin-dev@topik-mm.local
-- Password: DevOnly!2026  — REPLACE before any shared/staging/prod use
-- Hash: bcrypt cost 10
-- ---------------------------------------------------------------------------
INSERT INTO admin_users (name, email, password_hash, role, is_active) VALUES
    (
        'Dev Super Admin',
        'admin-dev@topik-mm.local',
        '$2b$10$UUVqcoQbgj8mvvcNpgOT7.FCgnvpSyfmv/2IHnkAOPwceJqXUZcjy',
        'super',
        true
    );

-- ---------------------------------------------------------------------------
-- Demo FO user (DEV ONLY — NOT for production)
-- Email: demo@topik-mm.local / Password: DemoUser!2026
-- ---------------------------------------------------------------------------
INSERT INTO users (
    email, password_hash, signup_provider, name_ko, name_en,
    birth_date, gender, nationality, first_language, phone,
    job_code, motive_code, purpose_code, preferred_lang, status
) VALUES
    (
        'demo@topik-mm.local',
        '$2b$10$If.U2FosirErz388QRy5Hu87K62Co3aJq4J9tamlTKKZiZw5iRate',
        'email',
        '데모 사용자', 'Demo User',
        '19980101', '1', '미얀마', '미얀마어', '+959123456789',
        2, 3, 3, 'ko', 'active'
    );

-- ---------------------------------------------------------------------------
-- Sample notice (제106회 접수 안내)
-- ---------------------------------------------------------------------------
INSERT INTO notices (
    category, title, body_html, is_published, is_pinned,
    view_count, author_admin_id, published_at
)
SELECT
    'important',
    '제106회 TOPIK 접수 안내(2026.06.01 ~ 07.26)',
    '<p>제106회 TOPIK 접수가 시작되었습니다. 응시료: TOPIK Ⅰ 50,000 MMK / TOPIK Ⅱ 75,000 MMK (오프라인 수납).</p>',
    true, true, 0, a.id, '2026-06-01 09:00:00+06:30'
FROM admin_users a
WHERE a.email = 'admin-dev@topik-mm.local';

-- ---------------------------------------------------------------------------
-- Exam number sequences (initialized for round 106)
-- ---------------------------------------------------------------------------
INSERT INTO exam_number_sequences (exam_round_id, exam_venue_id, exam_level, last_serial)
SELECT r.id, v.id, lvl.level, 0
FROM exam_rounds r
CROSS JOIN exam_venues v
CROSS JOIN (VALUES ('I'), ('II')) AS lvl(level)
WHERE r.round_no = 106
  AND v.venue_code IN ('01', '02', '03', '04');

COMMIT;
