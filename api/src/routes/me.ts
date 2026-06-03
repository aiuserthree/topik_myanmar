import bcrypt from "bcrypt";
import type { FastifyInstance } from "fastify";
import { pool } from "../db.js";
import { requireFoUser } from "../lib/auth.js";
import {
  genderToCode,
  isValidPassword,
  normalizeBirthDate,
} from "../lib/validation.js";

interface UpdateMeBody {
  name_ko?: string;
  name_en?: string;
  birth_date?: string;
  gender?: string;
  nationality?: string;
  first_language?: string;
  phone?: string;
  job_code?: number;
  motive_code?: number;
  purpose_code?: number;
  marketing_opt_in?: boolean;
  photo_base64?: string | null;
}

export async function meRoutes(app: FastifyInstance) {
  app.get(
    "/api/v1/me",
    { preHandler: requireFoUser },
    async (req, reply) => {
      const userId = req.authUser!.id;
      try {
        const { rows } = await pool.query(
          `SELECT id, email, name_ko, name_en, birth_date, gender, nationality,
                  first_language, phone, passport_no, job_code, motive_code,
                  purpose_code, photo_file_id, preferred_lang, marketing_opt_in,
                  status, rev, created_at, updated_at
           FROM users
           WHERE id = $1 AND status = 'active'
           LIMIT 1`,
          [userId]
        );
        if (rows.length === 0) {
          return reply.status(404).send({
            error: { code: "NOT_FOUND", message: "사용자를 찾을 수 없습니다." },
          });
        }
        const u = rows[0];
        return {
          user: {
            id: u.id,
            email: u.email,
            name_ko: u.name_ko,
            name_en: u.name_en,
            birth_date: u.birth_date,
            gender: u.gender,
            nationality: u.nationality,
            first_language: u.first_language,
            phone: u.phone,
            passport_no: u.passport_no,
            job_code: u.job_code,
            motive_code: u.motive_code,
            purpose_code: u.purpose_code,
            photo_file_id: u.photo_file_id,
            preferred_lang: u.preferred_lang,
            marketing_opt_in: u.marketing_opt_in,
            rev: u.rev,
          },
        };
      } catch (err) {
        app.log.error(err);
        return reply.status(503).send({
          error: { code: "INTERNAL_ERROR", message: "database_unavailable" },
        });
      }
    }
  );

  // --------------------------------------------------------------------------
  // PATCH /me — update profile (basic info + photo)
  // --------------------------------------------------------------------------
  app.patch<{ Body: UpdateMeBody }>(
    "/api/v1/me",
    { preHandler: requireFoUser },
    async (req, reply) => {
      const userId = req.authUser!.id;
      const body = req.body ?? {};

      const sets: string[] = [];
      const params: unknown[] = [];
      let idx = 1;

      function setField(col: string, value: unknown) {
        sets.push(`${col} = $${idx++}`);
        params.push(value);
      }

      if (body.name_ko !== undefined) {
        if (!String(body.name_ko).trim()) {
          return reply.status(400).send({
            error: { code: "VALIDATION_ERROR", message: "한글 성명을 입력해 주세요." },
          });
        }
        setField("name_ko", String(body.name_ko).trim());
      }
      if (body.name_en !== undefined) {
        if (!String(body.name_en).trim()) {
          return reply.status(400).send({
            error: { code: "VALIDATION_ERROR", message: "영문 성명을 입력해 주세요." },
          });
        }
        setField("name_en", String(body.name_en).trim());
      }
      if (body.birth_date !== undefined) {
        const birth = normalizeBirthDate(String(body.birth_date));
        if (!birth) {
          return reply.status(400).send({
            error: { code: "VALIDATION_ERROR", message: "생년월일을 YYYYMMDD 형식으로 입력해 주세요." },
          });
        }
        setField("birth_date", birth);
      }
      if (body.gender !== undefined) {
        const g = genderToCode(String(body.gender));
        if (!g) {
          return reply.status(400).send({
            error: { code: "VALIDATION_ERROR", message: "성별을 선택해 주세요." },
          });
        }
        setField("gender", g);
      }
      if (body.nationality !== undefined) setField("nationality", String(body.nationality).trim());
      if (body.first_language !== undefined) setField("first_language", String(body.first_language).trim());
      if (body.phone !== undefined) {
        if (!String(body.phone).trim()) {
          return reply.status(400).send({
            error: { code: "VALIDATION_ERROR", message: "연락처를 입력해 주세요." },
          });
        }
        setField("phone", String(body.phone).trim());
      }
      if (body.job_code !== undefined && Number.isFinite(Number(body.job_code))) {
        setField("job_code", Number(body.job_code));
      }
      if (body.motive_code !== undefined && Number.isFinite(Number(body.motive_code))) {
        setField("motive_code", Number(body.motive_code));
      }
      if (body.purpose_code !== undefined && Number.isFinite(Number(body.purpose_code))) {
        setField("purpose_code", Number(body.purpose_code));
      }
      if (body.marketing_opt_in !== undefined) {
        setField("marketing_opt_in", !!body.marketing_opt_in);
      }

      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        // Optional new photo → file_attachments, then point users.photo_file_id at it.
        if (body.photo_base64 && body.photo_base64.length > 100) {
          const key = `stub://user/${userId}/photo-${Date.now()}`;
          const ins = await client.query(
            `INSERT INTO file_attachments (
               owner_type, owner_id, storage_key, original_filename,
               mime_type, size_bytes
             ) VALUES ('user_photo', $1, $2, 'profile-photo.jpg', 'image/jpeg', $3)
             RETURNING id`,
            [userId, key, Math.min(body.photo_base64.length, 2_000_000)]
          );
          setField("photo_file_id", Number(ins.rows[0].id));
        }

        if (sets.length === 0) {
          await client.query("ROLLBACK");
          return reply.status(400).send({
            error: { code: "VALIDATION_ERROR", message: "변경할 내용이 없습니다." },
          });
        }

        params.push(userId);
        await client.query(
          `UPDATE users SET ${sets.join(", ")}, updated_at = NOW(), rev = rev + 1
           WHERE id = $${idx} AND status = 'active'`,
          params
        );

        const { rows } = await client.query(
          `SELECT id, email, name_ko, name_en, birth_date, gender, nationality,
                  first_language, phone, passport_no, job_code, motive_code,
                  purpose_code, photo_file_id, preferred_lang, marketing_opt_in, rev
           FROM users WHERE id = $1`,
          [userId]
        );
        await client.query("COMMIT");

        const u = rows[0];
        return {
          user: {
            id: u.id,
            email: u.email,
            name_ko: u.name_ko,
            name_en: u.name_en,
            birth_date: u.birth_date,
            gender: u.gender,
            nationality: u.nationality,
            first_language: u.first_language,
            phone: u.phone,
            passport_no: u.passport_no,
            job_code: u.job_code,
            motive_code: u.motive_code,
            purpose_code: u.purpose_code,
            photo_file_id: u.photo_file_id,
            preferred_lang: u.preferred_lang,
            marketing_opt_in: u.marketing_opt_in,
            rev: u.rev,
          },
          message: "회원정보가 수정되었습니다.",
        };
      } catch (err) {
        await client.query("ROLLBACK");
        app.log.error(err);
        return reply.status(503).send({
          error: { code: "INTERNAL_ERROR", message: "database_unavailable" },
        });
      } finally {
        client.release();
      }
    }
  );

  // --------------------------------------------------------------------------
  // POST /me/change-password
  // --------------------------------------------------------------------------
  app.post<{
    Body: {
      current_password?: string;
      new_password?: string;
      new_password_confirm?: string;
    };
  }>(
    "/api/v1/me/change-password",
    { preHandler: requireFoUser },
    async (req, reply) => {
      const userId = req.authUser!.id;
      const current = String(req.body?.current_password ?? "");
      const next = String(req.body?.new_password ?? "");
      const confirm = String(req.body?.new_password_confirm ?? "");

      if (!isValidPassword(next)) {
        return reply.status(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "새 비밀번호는 8자 이상, 영문·숫자·특수문자를 각각 포함해야 합니다.",
          },
        });
      }
      if (next !== confirm) {
        return reply.status(400).send({
          error: { code: "VALIDATION_ERROR", message: "새 비밀번호 확인이 일치하지 않습니다." },
        });
      }

      try {
        const { rows } = await pool.query(
          `SELECT password_hash FROM users WHERE id = $1 AND status = 'active'`,
          [userId]
        );
        if (rows.length === 0) {
          return reply.status(404).send({
            error: { code: "NOT_FOUND", message: "사용자를 찾을 수 없습니다." },
          });
        }
        const hash = rows[0].password_hash as string | null;
        if (!hash) {
          return reply.status(422).send({
            error: {
              code: "BUSINESS_RULE_VIOLATION",
              message: "Google 계정은 비밀번호를 변경할 수 없습니다.",
            },
          });
        }
        const ok = await bcrypt.compare(current, hash);
        if (!ok) {
          return reply.status(400).send({
            error: { code: "INVALID_PASSWORD", message: "현재 비밀번호가 일치하지 않습니다." },
          });
        }
        const newHash = await bcrypt.hash(next, 10);
        await pool.query(
          `UPDATE users SET password_hash = $1, password_changed_at = NOW(),
                 updated_at = NOW(), rev = rev + 1
           WHERE id = $2`,
          [newHash, userId]
        );
        return { message: "비밀번호가 변경되었습니다." };
      } catch (err) {
        app.log.error(err);
        return reply.status(503).send({
          error: { code: "INTERNAL_ERROR", message: "database_unavailable" },
        });
      }
    }
  );

  // --------------------------------------------------------------------------
  // POST /me/withdraw — withdraw account, cancel unpaid applications
  // --------------------------------------------------------------------------
  app.post<{ Body: { password?: string } }>(
    "/api/v1/me/withdraw",
    { preHandler: requireFoUser },
    async (req, reply) => {
      const userId = req.authUser!.id;
      const password = String(req.body?.password ?? "");

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const { rows } = await client.query(
          `SELECT password_hash FROM users WHERE id = $1 AND status = 'active' FOR UPDATE`,
          [userId]
        );
        if (rows.length === 0) {
          await client.query("ROLLBACK");
          return reply.status(404).send({
            error: { code: "NOT_FOUND", message: "사용자를 찾을 수 없습니다." },
          });
        }
        const hash = rows[0].password_hash as string | null;
        // If the account has a password, require it to confirm withdrawal.
        if (hash) {
          if (!password) {
            await client.query("ROLLBACK");
            return reply.status(400).send({
              error: { code: "PASSWORD_REQUIRED", message: "비밀번호를 입력해 주세요." },
            });
          }
          const ok = await bcrypt.compare(password, hash);
          if (!ok) {
            await client.query("ROLLBACK");
            return reply.status(400).send({
              error: { code: "INVALID_PASSWORD", message: "비밀번호가 일치하지 않습니다." },
            });
          }
        }

        // Cancel still-cancellable (unpaid) applications.
        await client.query(
          `UPDATE applications
           SET status = 'cancelled', cancelled_at = NOW(),
               cancel_reason = '회원 탈퇴', updated_at = NOW(), rev = rev + 1
           WHERE user_id = $1
             AND status IN ('submitted', 'photo_review', 'payment_pending')
             AND payment_status = 'unpaid'`,
          [userId]
        );

        await client.query(
          `UPDATE users
           SET status = 'withdrawn', withdrawn_at = NOW(),
               updated_at = NOW(), rev = rev + 1
           WHERE id = $1`,
          [userId]
        );
        await client.query("COMMIT");

        return { withdrawn: true, message: "회원 탈퇴가 완료되었습니다." };
      } catch (err) {
        await client.query("ROLLBACK");
        app.log.error(err);
        return reply.status(503).send({
          error: { code: "INTERNAL_ERROR", message: "database_unavailable" },
        });
      } finally {
        client.release();
      }
    }
  );
}
