#!/usr/bin/env node
/**
 * Create or update a BO admin account — SAFE production provisioning.
 *
 * Plain Node ESM (like migrate.js) so it runs with `node` using only runtime
 * deps (pg, bcrypt, dotenv) — no build / no tsx required, even in a
 * devDependency-pruned production image.
 *
 * No hardcoded passwords. Reads credentials from CLI args or env, or prompts
 * for the password interactively (hidden input). Password is bcrypt-hashed
 * (cost 10) before it ever touches the database.
 *
 * Usage:
 *   # interactive (recommended — password never in shell history)
 *   npm run create-admin -- --email ops@embassy.go.kr --name "운영자"
 *
 *   # non-interactive (CI / scripted) — password from env
 *   ADMIN_EMAIL=ops@embassy.go.kr ADMIN_NAME="운영자" ADMIN_PASSWORD='********' \
 *     ADMIN_ROLE=super npm run create-admin
 *
 * Flags / env:
 *   --email   | ADMIN_EMAIL     (required)
 *   --name    | ADMIN_NAME      (default: email local-part)
 *   --password| ADMIN_PASSWORD  (omit to be prompted securely)
 *   --role    | ADMIN_ROLE      (super | standard | readonly; default super)
 *
 * Requires DATABASE_URL (read from api/.env or process env). Re-runnable:
 * updates password/name/role and re-activates an existing account by email.
 */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import bcrypt from "bcrypt";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(resolve(__dirname, ".."), ".env") });

const VALID_ROLES = new Set(["super", "standard", "readonly"]);

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Mirrors api/src/lib/validation.ts isValidPassword (8+, letter, digit, symbol).
function isValidPassword(pw) {
  return (
    pw.length >= 8 &&
    /[A-Za-z]/.test(pw) &&
    /\d/.test(pw) &&
    /[^A-Za-z0-9]/.test(pw)
  );
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const eq = key.indexOf("=");
    if (eq >= 0) {
      out[key.slice(0, eq)] = key.slice(eq + 1);
    } else if (argv[i + 1] && !argv[i + 1].startsWith("--")) {
      out[key] = argv[++i];
    } else {
      out[key] = "true";
    }
  }
  return out;
}

function promptHidden(query) {
  return new Promise((resolvePromise, reject) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
      reject(
        new Error(
          "비대화형 환경입니다. ADMIN_PASSWORD 환경변수 또는 --password 로 비밀번호를 전달하세요."
        )
      );
      return;
    }
    stdout.write(query);
    stdin.resume();
    stdin.setRawMode(true);
    let pw = "";
    const onData = (buf) => {
      const ch = buf.toString("utf8");
      if (ch === "\n" || ch === "\r" || ch === "\u0004") {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener("data", onData);
        stdout.write("\n");
        resolvePromise(pw);
      } else if (ch === "\u0003") {
        stdout.write("\n");
        process.exit(130);
      } else if (ch === "\u007f" || ch === "\b") {
        pw = pw.slice(0, -1);
      } else if (ch.charCodeAt(0) >= 0x20) {
        pw += ch;
      }
    };
    stdin.on("data", onData);
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const email = (args.email ?? process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const role = (args.role ?? process.env.ADMIN_ROLE ?? "super").trim();
  let name = (args.name ?? process.env.ADMIN_NAME ?? "").trim();
  let password = args.password ?? process.env.ADMIN_PASSWORD ?? "";

  if (!email || !isValidEmail(email)) {
    console.error("✗ 유효한 이메일이 필요합니다. (--email 또는 ADMIN_EMAIL)");
    process.exit(1);
  }
  if (!VALID_ROLES.has(role)) {
    console.error(`✗ role 은 super | standard | readonly 중 하나여야 합니다. (받은 값: ${role})`);
    process.exit(1);
  }
  if (!name) name = email.split("@")[0] ?? "admin";

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("✗ DATABASE_URL 이 설정되어 있지 않습니다. (api/.env 또는 환경변수)");
    process.exit(1);
  }

  if (!password) {
    password = await promptHidden(`비밀번호 입력 (${email}): `);
    const confirm = await promptHidden("비밀번호 확인: ");
    if (password !== confirm) {
      console.error("✗ 비밀번호가 일치하지 않습니다.");
      process.exit(1);
    }
  }
  if (!isValidPassword(password)) {
    console.error(
      "✗ 비밀번호 정책 미충족: 8자 이상, 영문/숫자/특수문자를 각각 1자 이상 포함해야 합니다."
    );
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 10);
  const pool = new pg.Pool({ connectionString: databaseUrl });
  try {
    const { rows } = await pool.query(
      `INSERT INTO admin_users (name, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT (email) DO UPDATE SET
         name = EXCLUDED.name,
         password_hash = EXCLUDED.password_hash,
         role = EXCLUDED.role,
         is_active = true,
         updated_at = NOW(),
         rev = admin_users.rev + 1
       RETURNING id, email, role,
                 (xmax = 0) AS inserted`,
      [name, email, hash, role]
    );
    const r = rows[0];
    const action = r.inserted ? "생성" : "갱신";
    console.log(`✓ 관리자 ${action} 완료 — id=${r.id}, email=${r.email}, role=${r.role}`);
    console.log("  로그인: POST /api/v1/auth/login  (BO: html/C안/BO/login.html)");
  } catch (err) {
    console.error("✗ 관리자 저장 실패:", err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
