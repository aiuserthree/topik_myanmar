import type { FastifyInstance } from "fastify";
import { pool } from "../db.js";

export async function examRoundsRoutes(app: FastifyInstance) {
  app.get("/api/v1/exam-rounds", async (_req, reply) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, round_no, title, exam_date,
                registration_start_at, registration_end_at,
                result_announcement_date,
                fee_level_i, fee_level_ii, capacity,
                registration_status, exam_number_visible_at,
                is_active, rev, created_at, updated_at
         FROM exam_rounds
         WHERE is_active = true
         ORDER BY round_no DESC`
      );
      return { data: rows };
    } catch (err) {
      app.log.error(err);
      return reply.status(503).send({ error: "database_unavailable" });
    }
  });
}
