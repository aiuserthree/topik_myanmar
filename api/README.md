# TOPIK Myanmar API (Phase 0–1)

Node.js 20 + Fastify 4 + TypeScript skeleton. PostgreSQL schema lives in `../db/` (Flyway SQL).

**macOS 로컬 실행 (Docker/Postgres 설치부터):** [로컬실행_가이드.md](./로컬실행_가이드.md)

## Prerequisites

- Node.js 20+
- Docker (optional, for local Postgres)
- `psql` CLI (for `npm run migrate`)

## Quick start

```bash
# 1. Start Postgres
docker compose up -d

# 2. Install & migrate
cd api
cp .env.example .env
npm install
npm run migrate

# 3. Run API
npm run dev
```

Server: `http://localhost:3000`

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | — | Process health |
| GET | `/health/db` | — | PostgreSQL ping |
| GET | `/api/v1/exam-rounds` | — | Exam rounds (`?registration_status=open`) |
| GET | `/api/v1/exam-venues` | — | Active exam venues |
| POST | `/api/v1/auth/login` | — | Email/password → JWT (FO user or admin) |
| GET | `/api/v1/me` | Bearer | FO profile |
| POST | `/api/v1/application-submissions` | Bearer | 4단계 접수 제출 (submission + 1–2 applications) |
| GET | `/api/v1/applications` | Bearer | 마이페이지 접수 목록 (submission별 집계) |

### Submit example (Phase 1)

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@topik-mm.local","password":"DemoUser!2026"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

curl -s -X POST http://localhost:3000/api/v1/application-submissions \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"exam_round_id":1,"exam_levels":["I"],"exam_venue_id":1,"photo_checklist_confirmed":true}'
```

Replace `exam_round_id` / `exam_venue_id` with IDs from `GET /api/v1/exam-rounds` and `GET /api/v1/exam-venues`.

### My applications (Phase 1)

```bash
curl -s http://localhost:3000/api/v1/applications \
  -H "Authorization: Bearer $TOKEN"
```

**Photo v0.1:** optional `photo_file_id` (user profile) or `photo_base64` → `file_attachments` stub row (`storage_key` prefix `stub://`). Full S3 presign is Phase 3.

**Policy 0527:** no email on registration complete.

### Dev credentials

From `db/seed/dev_seed.sql`:

| Role | Email | Password |
|------|-------|----------|
| FO user | `demo@topik-mm.local` | `DemoUser!2026` |
| Super admin | `admin-dev@topik-mm.local` | `DevOnly!2026` |

### Login example

```bash
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@topik-mm.local","password":"DemoUser!2026"}'
```

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Hot reload (`tsx watch`) |
| `npm run build` | Compile to `dist/` |
| `npm start` | Run compiled server |
| `npm run migrate` | Apply `V001` schema (skip if `users` exists) + dev seed via psql |
| `npm run migrate:seed` | Dev seed only (idempotent) |

## Environment

See `.env.example`. Key variables:

- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` / `JWT_REFRESH_SECRET` — token signing
- `CORS_ORIGINS` — allowed FO origins (Vercel + local)

## Related

- `../db/README.md` — schema & Flyway
- `../docs/기능정의서/백엔드_스택_결정.md` — stack & phases
- `../docs/기능정의서/REST_API_명세_초안.md` — full API spec
