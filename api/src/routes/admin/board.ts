import type { FastifyInstance } from "fastify";
import { config } from "../../config.js";
import { pool } from "../../db.js";
import { requireAdmin } from "../../lib/auth.js";
import { formatDateTime, insertAuditLog } from "../../lib/admin-helpers.js";
import {
  buildEmailDefaults,
  enqueueEmail,
} from "../../lib/email-templates/enqueue-notification.js";

const BOARD_NAME: Record<string, string> = {
  refund_correction: "환불·정보정정신청",
  inquiry: "문의게시판",
};

function postDetailUrl(boardType: string, postId: number): string {
  const base = config.publicFoBase;
  if (boardType === "refund_correction") {
    return `${base}/refund-correction.html?id=${postId}`;
  }
  return `${base}/qna.html?id=${postId}`;
}

export async function adminBoardRoutes(app: FastifyInstance) {
  app.post<{
    Params: { id: string };
    Body: {
      reply?: string;
      activity_type?: string;
      workflow_status?: string;
    };
  }>(
    "/api/v1/admin/board/posts/:id/reply",
    { preHandler: requireAdmin },
    async (req, reply) => {
      const postId = Number(req.params.id);
      const adminReply = String(req.body?.reply ?? "").trim();
      const activityType = String(req.body?.activity_type ?? "공식 답변").trim();
      const workflowStatus = String(req.body?.workflow_status ?? "answered").trim();

      if (!Number.isFinite(postId)) {
        return reply.status(400).send({
          error: { code: "VALIDATION_ERROR", message: "잘못된 요청입니다." },
        });
      }
      if (!adminReply || adminReply.length < 2) {
        return reply.status(400).send({
          error: { code: "VALIDATION_ERROR", message: "답변 내용을 입력해 주세요." },
        });
      }

      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        const postRes = await client.query(
          `SELECT p.id, p.board_type, p.title, p.workflow_status, p.user_id,
                  u.email, u.name_ko, u.preferred_lang
           FROM board_posts p
           INNER JOIN users u ON u.id = p.user_id
           WHERE p.id = $1
           FOR UPDATE OF p`,
          [postId]
        );
        if (postRes.rows.length === 0) {
          await client.query("ROLLBACK");
          return reply.status(404).send({
            error: { code: "NOT_FOUND", message: "게시글을 찾을 수 없습니다." },
          });
        }
        const post = postRes.rows[0];
        const statusBefore = post.workflow_status;
        const now = new Date();

        await client.query(
          `UPDATE board_posts
           SET admin_reply = $2,
               admin_replied_at = $3,
               admin_replier_id = $4,
               workflow_status = $5,
               updated_at = NOW()
           WHERE id = $1`,
          [postId, adminReply, now, req.authAdmin!.id, workflowStatus]
        );

        await insertAuditLog(client, {
          adminId: req.authAdmin!.id,
          targetTable: "board_posts",
          targetId: postId,
          action: "board_reply",
          statusBefore,
          statusAfter: workflowStatus,
        });

        await client.query("COMMIT");

        const locale = String(post.preferred_lang ?? "ko");
        const boardName = BOARD_NAME[post.board_type] ?? post.board_type;
        void enqueueEmail(pool, {
          templateKey: "board_reply",
          toEmail: String(post.email),
          userId: Number(post.user_id),
          locale,
          variables: buildEmailDefaults({
            userName: String(post.name_ko ?? post.email),
            boardName,
            postTitle: String(post.title),
            activityType,
            postUrl: postDetailUrl(String(post.board_type), postId),
          }),
        }).catch((err) => app.log.error(err));

        return {
          post_id: postId,
          workflow_status: workflowStatus,
          admin_replied_at: formatDateTime(now),
          email_queued: true,
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
}
