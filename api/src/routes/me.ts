import type { FastifyInstance } from "fastify";
import { pool } from "../db.js";
import { requireFoUser } from "../lib/auth.js";

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
}
