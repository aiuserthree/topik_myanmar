# TOPIK Myanmar — 작업 인수인계 (컨텍스트 핸드오프)

> 새 대화창에서 이 파일을 첨부(`@docs/HANDOFF.md`)하고 "이어서 작업하자"라고 하면 맥락이 이어집니다.
> 최종 업데이트: 2026-06-04

## ⏩ 이번 세션(2026-06-04) 변경 요약 — 새 대화는 여기부터 읽기
- **대용량 zip**: `시안/.../디자인 시안...v1.0.zip`(실측 67.6MiB) git 추적 해제 + `.gitignore`에 `시안/**/*.zip`. 커밋 `359ad9f`. (※방법 A — **히스토리엔 67MB가 그대로 남음**. 진짜로 줄이려면 추후 Git LFS 또는 `git filter-repo`로 히스토리 정리 필요 = force push)
- **JWT 시크릿**: Railway Variables에 강한 `JWT_SECRET`/`JWT_REFRESH_SECRET`(기본값 아님) + `APP_ENV=production` 들어가 있음 확인 → **해결 완료**
- **Railway env 추가**: `CORS_ORIGINS=https://topik-myanmar.vercel.app,https://topik-myanmar-c-bo.vercel.app`, `PUBLIC_FO_BASE`, `PUBLIC_BO_BASE`, 메일 3종(`MAIL_PROVIDER=resend`,`RESEND_API_KEY`,`MAIL_FROM=...@chodrum.com`)
- **BO 배포 정상화**: Vercel 프로젝트 `topik-myanmar-c-bo`가 구 React 목업(`html/C안/BO(admin)/project/admin.html`)을 띄우던 문제 → **신규 `build-bo.py` + `deploy-bo/vercel.json`** 추가. **BO Vercel 설정: Root Directory=`deploy-bo`, Build=`python3 ../build-bo.py`, Output=`../public-bo`**. 커밋 `27a03b2`,`456be13`. BO URL: https://topik-myanmar-c-bo.vercel.app/login.html
- **BO 디자인 이식(React→정적)**: 구 React 목업 디자인을 실연동 BO(`html/C안/BO/`)에 HTML/CSS/JS로 재스킨(다크 사이드바+화이트 탑바, KPI 타일). API 연동 그대로. 커밋 `24c60e0`
- **부트스트랩 관리자 계정 생성**: `db/seed/dev_seed.sql`에 UPSERT 추가 → **ID `admin` / PW `admin1234!@#$`**(super). BO 로그인 아이디 칸 `type=email→text`. 커밋 `2233a22`. Railway 부팅 시 시드로 자동 생성됨.
  - ⚠ **보안**: 약한 고정 비번이 git에 들어감. **정식 오픈 전 반드시 교체(create-admin) 또는 시드 블록 제거**.
- **미해결(블로커)**: Resend `chodrum.com` 도메인 **Pending** → 메일 발송 시 `403 The chodrum.com domain is not verified`. DNS Verify 완료돼야 실발송 가능.
- 이번 세션 커밋: `359ad9f → 27a03b2 → 456be13 → 24c60e0 → 2233a22` (모두 `origin/main` 푸시 완료)

## 프로젝트 개요
- 경로: `/Users/jhcho/Documents/Myanmar` (git repo, origin: github.com/aiuserthree/topik_myanmar, branch `main`)
- 구성: FO 정적사이트(HTML/CSS/JS — **React 금지, 사용자 규칙**) + 백엔드 API(`api/`, Fastify+TypeScript+Postgres)
- 배포: FO=Vercel(`vercel.json` buildCommand=`python3 build.py`, 출력 `public/`), API=Railway(`railway.toml`, `api/Dockerfile`)
- 임시 FO: https://topik-myanmar.vercel.app
- 임시 BO: https://topik-myanmar-c-bo.vercel.app/login.html (Vercel 프로젝트 `topik-myanmar-c-bo`, Root=`deploy-bo`)
- 임시 API: https://topikmyanmar-production.up.railway.app
- 목표: 외부에서 모든 기능이 동작하는 대고객 정식 오픈

## 빌드/배포 명령
```bash
# FO 빌드 (html/C안/FO + html/shared → public/)
python3 build.py
# API 빌드
cd api && npm install && npm run build   # tsc
# 로컬 실행
docker compose up -d
cd api && npm run migrate && npm run dev          # API :3000
python3 build.py && python3 -m http.server 8080 --directory public  # FO :8080
```

## 현재 상태 (코드 완료)
- FO 전 페이지 실 API 연결: 회원가입(이메일인증)·로그인·아이디찾기·비번재설정·구글로그인(GOOGLE_CLIENT_ID로 게이팅)·공지·FAQ·문의/환불 게시판(목록/상세/작성)·시험접수 4단계·마이페이지(접수내역/취소)·내정보(GET/PATCH/비번변경/탈퇴)
- 이메일: 시안 14종(C안 에디토리얼)을 `api/src/lib/email-templates/`로 이식, FO/BO 트리거 연동. 메일러 플러그형(`api/src/lib/mailer.ts`: console/resend/smtp). 비동기 워커 `email-worker.ts`(ENABLE_EMAIL_WORKER, 기본 off), 마이그레이션 `db/migrations/V002__email_outbox_retry.sql`
- BO: 새 정적 BO `html/C안/BO/`(applications/rounds/venues/notices/faq/terms + login)가 실 admin API 연결. 구 React 목업 `html/C안/BO(admin)/project/admin.html`는 미사용
- admin API: `api/src/routes/admin/*`(승인/반려/사진심사/연명부xlsx/사진zip/회차·시험장·공지·FAQ·약관 CRUD), `requireAdmin` RBAC
- 보안: `@fastify/helmet`, 라우트별 `@fastify/rate-limit`, 로그인 무차별대입 잠금(`api/src/lib/login-throttle.ts`, 인메모리), 운영 JWT 시크릿 fail-fast(`config.ts`)
- 세션: `POST /api/v1/auth/refresh` + `html/shared/api-client.js` 401 자동 갱신
- i18n: 미얀마어 깨짐 0건, MY→EN→KO 폴백, 푸터 키 누락 버그 수정, guide/rules 본문 키 확장(`html/shared/topik-i18n-content.js`)
- 운영 프로비저닝: `db/seed/prod_seed.sql`(참조코드만), `api/scripts/create-admin.js`(bcrypt), `npm run migrate:prod`
- 빌드: API `npm run build`(tsc) ✅ / `python3 build.py` ✅ / JS syntax ✅
- 문서: `docs/DEPLOY.md`(배포 체크리스트·env·스모크)

## Git 상태
- 최신 커밋: `2233a22` "feat(bo): add bootstrap admin account ..." — `origin/main`에 푸시 완료
- 이번 세션 커밋 순서: `359ad9f`(zip 추적해제) → `27a03b2`(build-bo) → `456be13`(deploy-bo) → `24c60e0`(BO 재스킨) → `2233a22`(admin 계정)
- `.gitignore`: `node_modules/`, `scripts/node_modules/`, `시안/**/*.zip`, `public-bo/`, `html/C*/BO/dist/`. `.env`는 무시됨
- 미추적(커밋 안 함): `docs/HANDOFF.md`(이 파일), `이것저것체크사항.txt`
- 참고: 대용량 zip은 추적 해제됐지만 **git 히스토리엔 67MB 잔존** — 용량 줄이려면 LFS/`git filter-repo`(force push) 필요

## 배포 상태
- Vercel(FO=`topik-myanmar`, BO=`topik-myanmar-c-bo`)·Railway 모두 **GitHub 푸시로 자동 배포**
- FO 빌드: `python3 build.py` → `public/` (루트 `vercel.json`)
- **BO 빌드: Root Directory=`deploy-bo`, `deploy-bo/vercel.json`이 `python3 ../build-bo.py` → `../public-bo` 실행** (한글 경로 `html/C안/BO`를 Root로 쓰면 Vercel Linux에서 실패 → 이 우회 필수)
- 이 머신엔 vercel/railway CLI 미설치. Railway DB는 **internal 주소(`postgres.railway.internal`)라 로컬에서 접속 불가** → 로컬에서 `migrate:prod`/`create-admin` 하려면 Railway의 **Public URL(`*.proxy.rlwy.net`, `DATABASE_PUBLIC_URL`)** 필요
- 참고: Railway API 컨테이너는 부팅마다 `node scripts/migrate.js`(dev seed 포함) 실행 → dev 시드 관리자(`admin-dev@topik-mm.local`/`DevOnly!2026`)와 이번에 추가한 `admin`/`admin1234!@#$`가 **운영 DB에 시드됨**

## 메일 발송 (블로커: 도메인 미검증)
- Railway에 `MAIL_PROVIDER=resend`,`RESEND_API_KEY`,`MAIL_FROM=TOPIK Myanmar <no-reply@chodrum.com>` 설정 완료
- **현재 막힌 지점**: Resend `chodrum.com` 도메인 **Pending** → 가입/비번재설정 메일이 `403 validation_error: The chodrum.com domain is not verified`로 실패 (실제 에러 확인됨)
- 해결: Cafe24 DNS의 SPF/DKIM/DMARC를 Resend 화면 값과 1:1로 맞춰 입력 → Resend에서 **Verified** → 같은 설정으로 재테스트(코드 변경 불필요). 검증 전엔 Resend 가입 계정 이메일로만 발송 가능
- 고객사 MOFA 도메인 확정 시 Resend 새 도메인 검증 + `MAIL_FROM`만 교체

## 오픈 전 남은 것 (코드 아님 — 고객사/인프라 결정)
- **도메인·DNS 합의:** `docs/기능정의서/정책_합의_워크시트.md` §2.0 · IT 발송용 `docs/고객사_DNS_요청_템플릿.md` (운영 호스팅·메일 기준; Vercel/Railway/Resend는 템플릿 **부록** dev/UAT만)
1. **Resend `chodrum.com` DNS Verify** 완료 → 가입/비번 메일 실발송 테스트 (최우선 블로커)
2. **부트스트랩 `admin` 계정 보안 처리**: 정식 오픈 전 비번 교체(`create-admin`) 또는 `dev_seed.sql`의 admin 블록 제거 (약한 고정 비번이 git에 있음)
3. JWT/CORS/PUBLIC_*는 설정 완료. 운영 `GOOGLE_CLIENT_ID`(Google 로그인 쓸 경우)만 남음
4. 실 운영데이터 입력(회차·시험장·응시료·정원) — BO 화면(`admin`/`admin1234!@#$` 로그인)으로 가능
5. 약관·개인정보 최종 법무 문안 + MY/EN 원어민 번역(guide/rules 본문 ~200문자열 + 기타 페이지)
6. 사진 영구저장: 운영은 `STORAGE_PROVIDER=s3` 권장(Railway 디스크 휘발성)
7. (다중 인스턴스 확장 시) rate-limit/이메일워커 Redis — 단일이면 현행 OK

## 응시료/결제
- PG 미사용 확정(스펙). `exam_rounds.fee_level_i/ii` + `rules-fee.html`. 금액·환불표는 고객사 확정 필요

## 다음에 할 일 (이어서 작업 시 우선순위)
1. Resend `chodrum.com` 도메인 Verified 확인 → BO/FO에서 가입·비번재설정 메일 실발송 테스트
2. 배포 확인: BO `https://topik-myanmar-c-bo.vercel.app/login.html`에서 `admin`/`admin1234!@#$` 로그인 → `applications.html` 진입, BO에서 공지/회차 등록 → FO 반영 확인
3. (오픈 직전) `admin` 부트스트랩 계정 비번 교체 또는 시드 제거
4. 운영 데이터 입력 + 약관/번역 마무리

