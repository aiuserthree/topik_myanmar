import bcrypt from "bcrypt";
import type { FastifyInstance } from "fastify";
import { config } from "../../config.js";
import { pool } from "../../db.js";
import { requireAdmin } from "../../lib/auth.js";
import { generateTempPassword, insertAuditLog } from "../../lib/admin-helpers.js";
import {
  buildEmailDefaults,
  enqueueEmail,
} from "../../lib/email-templates/enqueue-notification.js";

export async function adminAdminUsersRoutes(app: FastifyInstance) {
  app.post<{ Params: { id: string } }>(
    "/api/v1/admin/admin-users/:id/reset-password",
    { preHandler: requireAdmin },
    async (req, reply) => {
      const adminUserId = Number(req.params.id);
      if (!Number.isFinite(adminUserId)) {
        return reply.status(400).send({
          error: { code: "VALIDATION_ERROR", message: "잘못된 요청입니다." },
        });
      }

      if (req.authAdmin!.dbRole !== "super" && adminUserId !== req.authAdmin!.id) {
        return reply.status(403).send({
          error: {
            code: "FORBIDDEN",
            message: "다른 관리자 비밀번호는 super 권한이 필요합니다.",
          },
        });
      }

      const tempPassword = generateTempPassword();
      const hash = await bcrypt.hash(tempPassword, 10);

      try {
        const upd = await pool.query(
          `UPDATE admin_users
           SET password_hash = $2, updated_at = NOW(), rev = rev + 1
           WHERE id = $1 AND is_active = true
           RETURNING email, name`,
          [adminUserId, hash]
        );
        if (upd.rows.length === 0) {
          return reply.status(404).send({
            error: { code: "NOT_FOUND", message: "관리자 계정을 찾을 수 없습니다." },
          });
        }

        const target = upd.rows[0];
        const adminUsername = String(target.email).split("@")[0] ?? String(target.name);

        await insertAuditLog(pool, {
          adminId: req.authAdmin!.id,
          targetTable: "admin_users",
          targetId: adminUserId,
          action: "admin_reset_password",
        });

        await enqueueEmail(pool, {
          templateKey: "temp_password_admin",
          toEmail: String(target.email),
          userId: null,
          locale: "ko",
          variables: buildEmailDefaults({
            adminUsername,
            temporaryPassword: tempPassword,
          }),
        });

        return {
          admin_user_id: adminUserId,
          email_queued: true,
          temporary_password: config.appEnv === "development" ? tempPassword : undefined,
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
