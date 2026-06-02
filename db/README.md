# TOPIK Myanmar — Database (v0.1)

PostgreSQL 15+ schema migrations and dev seed data for the TOPIK Myanmar registration system.

## Layout

```text
db/
├── migrations/          # Flyway versioned SQL (V001__, V002__, …)
│   └── V001__initial_schema.sql
├── seed/
│   └── dev_seed.sql     # Local/dev master data only
└── README.md
```

## Prerequisites

- PostgreSQL 15+ (local install or Docker)
- [Flyway](https://flywaydb.org/) CLI **or** plain `psql` for v0.1 bootstrap

## Quick start (psql)

```bash
# 1. Create database
createdb topik_mm_dev

# 2. Apply schema
psql -d topik_mm_dev -f db/migrations/V001__initial_schema.sql

# 3. Load dev seed (local only)
psql -d topik_mm_dev -f db/seed/dev_seed.sql
```

## Docker Compose (optional)

```yaml
# docker-compose.db.yml (snippet — add to project root if needed)
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: topik
      POSTGRES_PASSWORD: topik_dev
      POSTGRES_DB: topik_mm_dev
    ports:
      - "5432:5432"
    volumes:
      - topik_pgdata:/var/lib/postgresql/data
volumes:
  topik_pgdata:
```

After `docker compose up -d`:

```bash
export DATABASE_URL=postgresql://topik:topik_dev@localhost:5432/topik_mm_dev
psql "$DATABASE_URL" -f db/migrations/V001__initial_schema.sql
psql "$DATABASE_URL" -f db/seed/dev_seed.sql
```

## Flyway

```bash
flyway -url=jdbc:postgresql://localhost:5432/topik_mm_dev \
       -user=topik -password=topik_dev \
       -locations=filesystem:db/migrations \
       migrate
```

Seed is **not** run by Flyway — execute `db/seed/dev_seed.sql` manually in dev.

## Dev credentials (replace before prod)

| Role | Email | Password | Notes |
|------|-------|----------|-------|
| Super admin | `admin-dev@topik-mm.local` | `DevOnly!2026` | bcrypt in seed; rotate at UAT |
| Demo FO user | `demo@topik-mm.local` | `DemoUser!2026` | Optional; remove in prod |

## Related docs

- `docs/기능정의서/DB스키마_초안.md` — logical model
- `docs/기능정의서/마이그레이션_및_시드.md` — tool choice & strategy
- `docs/기능정의서/배포_아키텍처.md` — dev/prod DB separation
