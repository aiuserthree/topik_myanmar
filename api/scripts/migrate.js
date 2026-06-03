#!/usr/bin/env node
/**
 * Apply Flyway-style SQL migrations and dev seed via psql.
 * Requires: psql on PATH, DATABASE_URL (or docker-compose postgres defaults).
 *
 * Idempotent for local dev: skips V001 when `users` already exists.
 * Seed uses ON CONFLICT / NOT EXISTS — safe to re-run.
 *
 * Usage:
 *   npm run migrate          — schema (if needed) + DEV seed
 *   npm run migrate:seed     — DEV seed only
 *   npm run migrate:prod     — schema (if needed) + PROD seed (reference data only)
 *   npm run seed:prod        — PROD seed only (country/region codes)
 *
 * PROD seed (db/seed/prod_seed.sql) contains NO demo users and NO admin password.
 * Create the first admin separately with `npm run create-admin` (bcrypt, prompted).
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiRoot = resolve(__dirname, "..");
const repoRoot = resolve(apiRoot, "..");

config({ path: join(apiRoot, ".env") });

const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://topik:topik_dev@localhost:5432/topik_mm_dev";

const seedOnly = process.argv.includes("--seed-only");
const prodSeedOnly = process.argv.includes("--prod-seed-only");
const prod = process.argv.includes("--prod") || prodSeedOnly;

function runPsql(args, label) {
  const result = spawnSync("psql", [databaseUrl, ...args], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    console.error(`Failed: ${label}`);
    process.exit(result.status ?? 1);
  }
}

function runPsqlFile(file, label) {
  const path = join(repoRoot, file);
  if (!existsSync(path)) {
    console.error(`Missing ${path}`);
    process.exit(1);
  }
  console.log(`→ ${label}: ${file}`);
  runPsql(["-v", "ON_ERROR_STOP=1", "-f", path], label);
}

function usersTableExists() {
  const result = spawnSync(
    "psql",
    [
      databaseUrl,
      "-t",
      "-A",
      "-c",
      "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users' LIMIT 1;",
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    console.error("Failed: schema check (is Postgres running?)");
    process.exit(result.status ?? 1);
  }
  return result.stdout?.trim() === "1";
}

if (!seedOnly && !prodSeedOnly) {
  if (usersTableExists()) {
    console.log("→ schema already applied, skipping V001");
  } else {
    runPsqlFile("db/migrations/V001__initial_schema.sql", "schema migration");
  }

  // Additive migrations (V002+). These are written idempotently
  // (ADD COLUMN / CREATE INDEX ... IF NOT EXISTS) so they are safe to re-run on
  // every migrate, including on a fresh V001 install.
  const migrationsDir = join(repoRoot, "db/migrations");
  const extraMigrations = readdirSync(migrationsDir)
    .filter((f) => /^V\d+__.*\.sql$/.test(f) && !f.startsWith("V001__"))
    .sort();
  for (const file of extraMigrations) {
    runPsqlFile(join("db/migrations", file), `migration ${file}`);
  }
}

if (prod) {
  runPsqlFile("db/seed/prod_seed.sql", "prod seed (reference data)");
  console.log("Done. (PROD seed — create the first admin with `npm run create-admin`)");
} else {
  runPsqlFile("db/seed/dev_seed.sql", "dev seed");
  console.log("Done.");
}
