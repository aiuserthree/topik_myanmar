# html/shared — A/B/C 공통 JS

A안·B안·C안 FO/BO 프로토타입이 공유하는 스크립트. **운영 시안 확정: C안** (`docs/기능정의서/시안확정_C안.md`).

## Vercel 배포 (canonical FO = C안)

`build.py`가 **`html/C안/FO/` → `public/`** 복사 후 **`html/shared/` → `public/shared/`** 로 덮어씁니다. 미리보기·운영 FO URL은 빌드 산출물 기준 (`shared/…`).

## 이메일 (14종 · C안 에디토리얼)

| 항목 | 경로 |
|------|------|
| HTML/CSS 템플릿·미리보기 | `시안/email/` — `README.md` |
| outbox mock · `template_key` | `topik-mail.js` → `TOPIKMail.TEMPLATE_KEYS`, `enqueue()` |
| 프로덕션 | SMTP 워커 + `email_outbox` (미연동) |

## 모듈 목록

| 파일 | 전역/역할 | 주요 로드 페이지 |
|------|-----------|------------------|
| `roster-codes.js` | `TPKM_ROSTER_CODES` — 직업·응시동기·목적 코드/라벨 | A/B/C: 회원가입·프로필 (`signup`, `register`, `mypage-profile`) |
| `topik-lib-loader.js` | SheetJS 등 CDN 순차 로드 | A: `admin.html` (동적 로더) |
| `topik-mail.js` | 이메일 outbox mock · 14종 `template_key` | C BO `admin.html`, A/B admin |
| `topik-bo-core.js` | BO 세션 heartbeat, 접수 그리드 헬퍼 | A `admin.html`, B admin |
| `topik-export.js` | xlsx/csv보내기 (클라이언트) | A `admin.html`, B admin |
| `topik-i18n-content.js` | 정적 콘텐츠 KO/MY/EN 키 | A: `index`, `register`, `apply-howto`; B: `tm-auth.js` 동적 로드 |

## A안 전용 (`html/A안/js/` — A안 단독 미리보기 시)

| 파일 | 역할 |
|------|------|
| `admin-auth.js` | BO 로그인 세션 `sessionStorage` |
| `board-store.js` | 환불·문의 게시판 localStorage |
| `profile-store.js`, `content-store.js` | 회원·공지/FAQ mock |
| `i18n.js`, `fo-nav.js`, `board-page.js` 등 | FO UI |

B/C FO는 각 안의 `js/`·`assets/`에 별도 구현이 있을 수 있음 — 이번 단계에서는 **중복만 제거**, 동작 통합은 미착수.

## 스크립트 경로 규칙

| 안 | Vercel / `public/` (C FO 배포) | 소스 트리 직접 열기 |
|----|-------------------------------|---------------------|
| C안 FO | `shared/…`, `assets/…` | `python3 build.py` 후 `public/` 권장. 미빌드 시 `signup`/`mypage-profile`의 `shared/`는 FO 하위 `shared/`(i18n)만 존재 — `roster-codes.js`는 빌드 필요 |
| A안 FO | (미배포) `shared/…` if built from A | `html/A안` 기준 |
| B안 FO | (미배포) `../shared/…` | `html/B안` 기준 |

## localStorage → REST API (마이그레이션 메모)

프로토타입 키·대체 API는 `docs/기능정의서/REST_API_명세_초안.md` §6 참고.

| 프로토타입 | 모듈 | API 방향 |
|------------|------|----------|
| `topik_mm_users_v1` 등 | `profile-store.js` | `/users/me`, 회원가입 |
| `topik_mm_boards_v1` | `board-store.js` | `/board/posts` |
| `tm_admin_session_v1` | `admin-auth.js` | `/admin/auth/login` |
| 접수/회차 mock | `content-store.js`, BO core | `/applications`, `/admin/exam-rounds` |

`roster-codes.js`는 DB `job_code` 등 **마스터 데이터**로 이전; FO는 API 또는 빌드타임 JSON 로드로 교체 예정.

## 의도적 예외 (중복 유지)

- **`html/C안/FO/shared/topik-i18n-content.js`** — C안만 확장 키 포함. canonical `html/shared` 버전과 diff 후 병합 예정. **배포 시 `html/shared`가 `public/shared`를 덮어씀.**
- **C BO `project/shared/`**, **B `admin/`** — 경로가 다른 BO 스텁; FO 공통 4종만 `html/shared`로 통일.

## 체크리스트

- 개발자 체크리스트 NO.440 메모: canonical `html/shared/README.md`
- API·스키마 문서: `html/shared/topik-bo-core.js`, `roster-codes.js` 경로 반영됨
- 배포: `docs/기능정의서/배포_아키텍처.md`
