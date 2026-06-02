import type { FastifyInstance } from "fastify";
import { pool } from "../db.js";
import { requireFoUser } from "../lib/auth.js";

interface SubmitBody {
  exam_round_id?: number;
  exam_levels?: string[];
  exam_venue_id?: number;
  terms_agreed?: number[];
  photo_checklist_confirmed?: boolean;
  photo_file_id?: number | null;
  photo_base64?: string | null;
}

const VALID_LEVELS = new Set(["I", "II"]);

function normalizeLevels(raw: string[] | undefined): string[] {
  if (!raw?.length) return [];
  const out: string[] = [];
  for (const l of raw) {
    const u = String(l).toUpperCase();
    if (VALID_LEVELS.has(u) && !out.includes(u)) out.push(u);
  }
  return out;
}

function formatBirthDisplay(birth: string): string {
  if (!birth || birth.length !== 8) return birth;
  return `${birth.slice(0, 4)}-${birth.slice(4, 6)}-${birth.slice(6, 8)}`;
}

function genderLabel(g: string): string {
  return g === "1" ? "남" : g === "2" ? "여" : g;
}

async function resolveVenueId(
  client: { query: typeof pool.query },
  examRoundId: number,
  requestedVenueId?: number
): Promise<number | null> {
  if (requestedVenueId) {
    const check = await client.query(
      `SELECT v.id
       FROM exam_venues v
       INNER JOIN exam_round_venues rv ON rv.exam_venue_id = v.id
       WHERE rv.exam_round_id = $1 AND v.id = $2 AND v.is_active = true
       LIMIT 1`,
      [examRoundId, requestedVenueId]
    );
    if (check.rows.length > 0) return Number(check.rows[0].id);
    return null;
  }
  const fallback = await client.query(
    `SELECT v.id
     FROM exam_round_venues rv
     INNER JOIN exam_venues v ON v.id = rv.exam_venue_id
     WHERE rv.exam_round_id = $1 AND v.is_active = true
     ORDER BY v.venue_code
     LIMIT 1`,
    [examRoundId]
  );
  return fallback.rows.length > 0 ? Number(fallback.rows[0].id) : null;
}

async function resolvePhotoFileId(
  client: { query: typeof pool.query },
  userId: number,
  body: SubmitBody
): Promise<number | null> {
  if (body.photo_file_id) return body.photo_file_id;
  if (body.photo_base64 && body.photo_base64.length > 100) {
    const key = `stub://user/${userId}/photo-${Date.now()}`;
    const ins = await client.query(
      `INSERT INTO file_attachments (
         owner_type, owner_id, storage_key, original_filename,
         mime_type, size_bytes
       ) VALUES ('user_photo', $1, $2, 'register-photo.jpg', 'image/jpeg', $3)
       RETURNING id`,
      [userId, key, Math.min(body.photo_base64.length, 2_000_000)]
    );
    return Number(ins.rows[0].id);
  }
  const userRow = await client.query(
    `SELECT photo_file_id FROM users WHERE id = $1`,
    [userId]
  );
  return userRow.rows[0]?.photo_file_id
    ? Number(userRow.rows[0].photo_file_id)
    : null;
}

function makeApplicationNo(roundNo: number, level: string, appId: number): string {
  const base = `APP${roundNo}${level}`;
  const suffix = String(appId).padStart(24 - base.length, "0");
  return (base + suffix).slice(0, 24);
}

export async function applicationSubmissionsRoutes(app: FastifyInstance) {
  app.post<{ Body: SubmitBody }>(
    "/api/v1/application-submissions",
    { preHandler: requireFoUser },
    async (req, reply) => {
      const userId = req.authUser!.id;
      const body = req.body ?? {};
      const examRoundId = Number(body.exam_round_id);
      const levels = normalizeLevels(body.exam_levels);

      if (!examRoundId || levels.length === 0) {
        return reply.status(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "회차와 응시 급수를 선택해 주세요.",
            details: [
              { field: "exam_round_id", reason: "required" },
              { field: "exam_levels", reason: "min_one" },
            ],
          },
        });
      }
      if (!body.photo_checklist_confirmed) {
        return reply.status(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "사진 규격 확인이 필요합니다.",
            details: [{ field: "photo_checklist_confirmed", reason: "required" }],
          },
        });
      }

      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        const roundRes = await client.query(
          `SELECT id, round_no, title, exam_date, registration_status, is_active
           FROM exam_rounds WHERE id = $1 FOR UPDATE`,
          [examRoundId]
        );
        if (roundRes.rows.length === 0) {
          await client.query("ROLLBACK");
          return reply.status(404).send({
            error: { code: "NOT_FOUND", message: "회차를 찾을 수 없습니다." },
          });
        }
        const round = roundRes.rows[0];
        if (!round.is_active || round.registration_status !== "open") {
          await client.query("ROLLBACK");
          return reply.status(422).send({
            error: {
              code: "BUSINESS_RULE_VIOLATION",
              message: "현재 접수 가능한 회차가 아닙니다.",
            },
          });
        }

        const dupSubmission = await client.query(
          `SELECT id FROM application_submissions
           WHERE user_id = $1 AND exam_round_id = $2`,
          [userId, examRoundId]
        );
        if (dupSubmission.rows.length > 0) {
          await client.query("ROLLBACK");
          return reply.status(409).send({
            error: {
              code: "DUPLICATE_APPLICATION",
              message: "이미 해당 회차에 접수하셨습니다.",
            },
          });
        }

        for (const level of levels) {
          const dupLevel = await client.query(
            `SELECT id FROM applications
             WHERE user_id = $1 AND exam_round_id = $2 AND exam_level = $3
               AND status <> 'cancelled'`,
            [userId, examRoundId, level]
          );
          if (dupLevel.rows.length > 0) {
            await client.query("ROLLBACK");
            return reply.status(409).send({
              error: {
                code: "DUPLICATE_APPLICATION",
                message: `이미 TOPIK ${level} 접수가 있습니다.`,
              },
            });
          }
        }

        const venueId = await resolveVenueId(client, examRoundId, body.exam_venue_id);
        if (!venueId) {
          await client.query("ROLLBACK");
          return reply.status(400).send({
            error: {
              code: "VALIDATION_ERROR",
              message: "선택한 시험장을 사용할 수 없습니다.",
              details: [{ field: "exam_venue_id", reason: "invalid" }],
            },
          });
        }

        const userRes = await client.query(
          `SELECT id, email, name_ko, name_en, birth_date, gender, nationality,
                  first_language, phone, job_code, motive_code, purpose_code,
                  photo_file_id
           FROM users WHERE id = $1 AND status = 'active'`,
          [userId]
        );
        if (userRes.rows.length === 0) {
          await client.query("ROLLBACK");
          return reply.status(404).send({
            error: { code: "NOT_FOUND", message: "사용자를 찾을 수 없습니다." },
          });
        }
        const user = userRes.rows[0];

        const photoFileId = await resolvePhotoFileId(client, userId, body);

        let termsSnapshot: { term_ids: number[] } = { term_ids: [] };
        if (Array.isArray(body.terms_agreed) && body.terms_agreed.length > 0) {
          termsSnapshot = { term_ids: body.terms_agreed.map(Number).filter(Boolean) };
        } else {
          const termsRes = await client.query(
            `SELECT id FROM terms
             WHERE status = 'published' AND term_type IN ('service', 'privacy')
             ORDER BY term_type`
          );
          termsSnapshot = { term_ids: termsRes.rows.map((r) => Number(r.id)) };
        }

        const profileSnapshot = {
          name_ko: user.name_ko,
          name_en: user.name_en,
          birth_date: user.birth_date,
          birth_date_display: formatBirthDisplay(user.birth_date),
          gender: user.gender,
          gender_label: genderLabel(user.gender),
          nationality: user.nationality,
          first_language: user.first_language,
          phone: user.phone,
          email: user.email,
          job_code: user.job_code,
          motive_code: user.motive_code,
          purpose_code: user.purpose_code,
        };

        const now = new Date();
        const subRes = await client.query(
          `INSERT INTO application_submissions (
             user_id, exam_round_id, submitted_at, terms_snapshot
           ) VALUES ($1, $2, $3, $4)
           RETURNING id, submitted_at`,
          [userId, examRoundId, now, JSON.stringify(termsSnapshot)]
        );
        const submissionId = Number(subRes.rows[0].id);

        const applications: {
          id: number;
          exam_level: string;
          application_no: string;
          status: string;
          photo_review_status: string;
          payment_status: string;
        }[] = [];

        for (const level of levels) {
          const placeholderNo = `TMP${submissionId}${level}${Date.now()}`.slice(0, 24);
          const appRes = await client.query(
            `INSERT INTO applications (
               submission_id, user_id, exam_round_id, exam_level, exam_venue_id,
               application_no, status, photo_review_status, payment_status,
               profile_snapshot, photo_file_id
             ) VALUES (
               $1, $2, $3, $4, $5,
               $6, 'submitted', 'pending', 'unpaid',
               $7, $8
             )
             RETURNING id`,
            [
              submissionId,
              userId,
              examRoundId,
              level,
              venueId,
              placeholderNo,
              JSON.stringify(profileSnapshot),
              photoFileId,
            ]
          );
          const appId = Number(appRes.rows[0].id);
          const appNo = makeApplicationNo(Number(round.round_no), level, appId);
          await client.query(
            `UPDATE applications SET application_no = $1 WHERE id = $2`,
            [appNo, appId]
          );
          applications.push({
            id: appId,
            exam_level: level,
            application_no: appNo,
            status: "submitted",
            photo_review_status: "pending",
            payment_status: "unpaid",
          });
        }

        const venueRes = await client.query(
          `SELECT id, venue_code, name_ko FROM exam_venues WHERE id = $1`,
          [venueId]
        );
        const venue = venueRes.rows[0];

        await client.query("COMMIT");

        return reply.status(201).send({
          submission_id: submissionId,
          submitted_at: subRes.rows[0].submitted_at,
          exam_round: {
            id: round.id,
            round_no: round.round_no,
            title: round.title,
            exam_date: round.exam_date,
          },
          venue: {
            id: venue.id,
            venue_code: venue.venue_code,
            name_ko: venue.name_ko,
          },
          applications,
          photo_file_id: photoFileId,
        });
      } catch (err) {
        await client.query("ROLLBACK");
        app.log.error(err);
        const pgErr = err as { code?: string };
        if (pgErr.code === "23505") {
          return reply.status(409).send({
            error: {
              code: "DUPLICATE_APPLICATION",
              message: "이미 접수된 내역이 있습니다.",
            },
          });
        }
        return reply.status(503).send({
          error: { code: "INTERNAL_ERROR", message: "database_unavailable" },
        });
      } finally {
        client.release();
      }
    }
  );
}
