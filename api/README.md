# TOPIK Myanmar API (Phase 0)

Node.js 20 + Fastify 4 + TypeScript skeleton. PostgreSQL schema lives in `../db/` (Flyway SQL).

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

## Endpoints (Phase 0)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Process health |
| GET | `/health/db` | PostgreSQL ping |
| GET | `/api/v1/exam-rounds` | Active exam rounds |
| GET | `/api/v1/exam-venues` | Active exam venues |
| POST | `/api/v1/auth/login` | Email/password → JWT (FO user or admin) |

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
| `npm run migrate` | Apply `V001` schema + dev seed via psql |

## Environment

See `.env.example`. Key variables:

- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` / `JWT_REFRESH_SECRET` — token signing
- `CORS_ORIGINS` — allowed FO origins (Vercel + local)

## Related

- `../db/README.md` — schema & Flyway
- `../docs/기능정의서/백엔드_스택_결정.md` — stack & phases
- `../docs/기능정의서/REST_API_명세_초안.md` — full API spec
