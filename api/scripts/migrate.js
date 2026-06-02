#!/usr/bin/env node
/**
 * Apply Flyway-style SQL migrations and dev seed via psql.
 * Requires: psql on PATH, DATABASE_URL (or docker-compose postgres defaults).
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../..");

const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://topik:topik_dev@localhost:5432/topik_mm_dev";

function runPsql(file: string, label: string) {
  const path = join(repoRoot, file);
  if (!existsSync(path)) {
    console.error(`Missing ${path}`);
    process.exit(1);
  }
  console.log(`→ ${label}: ${file}`);
  const result = spawnSync("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1", "-f", path], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    console.error(`Failed: ${label}`);
    process.exit(result.status ?? 1);
  }
}

runPsql("db/migrations/V001__initial_schema.sql", "schema migration");
runPsql("db/seed/dev_seed.sql", "dev seed");
console.log("Done.");
