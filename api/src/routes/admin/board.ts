import type { FastifyInstance } from "fastify";
import { config } from "../../config.js";
import { pool } from "../../db.js";
import { requireAdmin, requireAnyAdmin } from "../../lib/auth.js";
import { formatDateTime, insertAuditLog } from "../../lib/admin-helpers.js";
import {
  buildEmailDefaults,
  enqueueEmail,
} from "../../lib/email-templates/enqueue-notification.js";

const BOARD_NAME: Record<string, string> = {
  refund_correction: "환불·정보정정신청",
  inquiry: "문의게시판",
};

const BOARD_TYPES = new Set(["refund_correction", "inquiry"]);
const WORKFLOW_STATUSES = new Set([
  "received",
  "in_review",
  "completed",
  "rejected",
  "awaiting_reply",
  "answered",
]);
const STATUS_LABEL: Record<string, string> = {
  received: "접수",
  in_review: "검토중",
  completed: "처리완료",
  rejected: "반려",
  awaiting_reply: "답변대기",
  answered: "답변완료",
};

function postDetailUrl(boardType: string, postId: number): string {
  const base = config.publicFoBase;
  if (boardType === "refund_correction") {
    return `${base}/refund-correction.html?id=${postId}`;
  }
  return `${base}/qna.html?id=${postId}`;
}

export async function adminBoardRoutes(app: FastifyInstance) {
  // -------------------------------------------------------------------------
  // GET /api/v1/admin/board/posts — 문의/환불·정정 목록 (board_type 필터 필수)
  // -------------------------------------------------------------------------
  app.get<{
    Querystring: {
      board_type?: string;
      q?: string;
      status?: string;
      category?: string;
      secret?: string;
      answered?: string;
      page?: string;
      page_size?: string;
    };
  }>(
    "/api/v1/admin/board/posts",
    { preHandler: requireAnyAdmin },
    async (req, reply) => {
      const boardType = req.query.board_type?.trim();
      if (!boardType || !BOARD_TYPES.has(boardType)) {
        return reply.status(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "board_type이 필요합니다 (inquiry | refund_correction).",
          },
        });
      }
      const page = Math.max(1, Number(req.query.page) || 1);
      const pageSize = Math.min(100, Math.max(1, Number(req.query.page_size) || 50));
      const offset = (page - 1) * pageSize;
      const conditions = ["p.board_type = $1"];
      const params: unknown[] = [boardType];
      let idx = 2;

      const status = req.query.status?.trim();
      if (status && WORKFLOW_STATUSES.has(status)) {
        conditions.push(`p.workflow_status = $${idx++}`);
        params.push(status);
      }
      const category = req.query.category?.trim();
      if (category && category !== "all") {
        conditions.push(`p.category = $${idx++}`);
        params.push(category);
      }
      if (req.query.secret === "1" || req.query.secret === "true") {
        conditions.push(`p.is_secret = true`);
      } else if (req.query.secret === "0" || req.query.secret === "false") {
        conditions.push(`p.is_secret = false`);
      }
      if (req.query.answered === "1" || req.query.answered === "true") {
        conditions.push(`p.admin_reply IS NOT NULL`);
      } else if (req.query.answered === "0" || req.query.answered === "false") {
        conditions.push(`p.admin_reply IS NULL`);
      }
      const q = req.query.q?.trim();
      if (q) {
        conditions.push(`(p.title ILIKE $${idx} OR u.name_ko ILIKE $${idx} OR u.email ILIKE $${idx})`);
        params.push(`%${q}%`);
        idx++;
      }
      const where = `WHERE ${conditions.join(" AND ")}`;

      try {
        const countRes = await pool.query(
          `SELECT COUNT(*)::int AS total
           FROM board_posts p
           INNER JOIN users u ON u.id = p.user_id
           ${where}`,
          params
        );
        const total = countRes.rows[0]?.total ?? 0;
        const listRes = await pool.query(
          `SELECT p.id, p.board_type, p.category, p.post_type, p.title,
                  p.is_secret, p.workflow_status, p.admin_reply IS NOT NULL AS has_reply,
                  p.admin_replied_at, p.created_at,
                  u.name_ko AS author_name, u.email AS author_email,
                  ar.email AS assignee_email, ar.name AS assignee_name
           FROM board_posts p
           INNER JOIN users u ON u.id = p.user_id
           LEFT JOIN admin_users ar ON ar.id = p.admin_replier_id
           ${where}
           ORDER BY p.created_at DESC, p.id DESC
           LIMIT $${idx++} OFFSET $${idx++}`,
          [...params, pageSize, offset]
        );
        return {
          items: listRes.rows.map((r) => ({
            id: Number(r.id),
            board_type: r.board_type,
            category: r.category,
            post_type: r.post_type,
            title: r.title,
            is_secret: r.is_secret,
            workflow_status: r.workflow_status,
            workflow_status_label: STATUS_LABEL[r.workflow_status] ?? r.workflow_status,
            has_reply: r.has_reply,
            author_name: r.author_name,
            author_email: r.author_email,
            assignee_email: r.assignee_email,
            assignee_name: r.assignee_name,
            admin_replied_at: r.admin_replied_at,
            created_at: r.created_at,
            created_at_label: formatDateTime(r.created_at),
          })),
          pagination: {
            page,
            page_size: pageSize,
            total_items: total,
            total_pages: Math.ceil(total / pageSize) || 1,
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

  // -------------------------------------------------------------------------
  // GET /api/v1/admin/board/posts/:id — 상세 (본문 + 댓글/대댓글, 비밀글 포함)
  // -------------------------------------------------------------------------
  app.get<{ Params: { id: string } }>(
    "/api/v1/admin/board/posts/:id",
    { preHandler: requireAnyAdmin },
    async (req, reply) => {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        return reply.status(400).send({
          error: { code: "VALIDATION_ERROR", message: "잘못된 요청입니다." },
        });
      }
      try {
        const { rows } = await pool.query(
          `SELECT p.id, p.board_type, p.category, p.post_type, p.title, p.body,
                  p.is_secret, p.workflow_status, p.admin_reply, p.admin_replied_at,
                  p.created_at, p.updated_at,
                  u.name_ko AS author_name, u.email AS author_email,
                  ar.email AS assignee_email, ar.name AS assignee_name
           FROM board_posts p
           INNER JOIN users u ON u.id = p.user_id
           LEFT JOIN admin_users ar ON ar.id = p.admin_replier_id
           WHERE p.id = $1
           LIMIT 1`,
          [id]
        );
        if (rows.length === 0) {
          return reply.status(404).send({
            error: { code: "NOT_FOUND", message: "게시글을 찾을 수 없습니다." },
          });
        }
        const r = rows[0];
        const commentsRes = await pool.query(
          `SELECT c.id, c.body, c.is_secret, c.is_deleted, c.created_at,
                  cu.name_ko AS user_name, ca.email AS admin_email, ca.name AS admin_name
           FROM board_comments c
           LEFT JOIN users cu ON cu.id = c.author_user_id
           LEFT JOIN admin_users ca ON ca.id = c.author_admin_id
           WHERE c.board_post_id = $1
           ORDER BY c.created_at ASC, c.id ASC`,
          [id]
        );
        return {
          id: Number(r.id),
          board_type: r.board_type,
          category: r.category,
          post_type: r.post_type,
          title: r.title,
          body: r.body,
          is_secret: r.is_secret,
          workflow_status: r.workflow_status,
          workflow_status_label: STATUS_LABEL[r.workflow_status] ?? r.workflow_status,
          admin_reply: r.admin_reply,
          admin_replied_at: r.admin_replied_at,
          author_name: r.author_name,
          author_email: r.author_email,
          assignee_email: r.assignee_email,
          assignee_name: r.assignee_name,
          created_at: r.created_at,
          created_at_label: formatDateTime(r.created_at),
          comments: commentsRes.rows
            .filter((c) => !c.is_deleted)
            .map((c) => ({
              id: Number(c.id),
              body: c.body,
              is_secret: c.is_secret,
              is_admin: !!c.admin_email,
              author: c.admin_name || c.admin_email || c.user_name || "—",
              created_at: c.created_at,
              created_at_label: formatDateTime(c.created_at),
            })),
        };
      } catch (err) {
        app.log.error(err);
        return reply.status(503).send({
          error: { code: "INTERNAL_ERROR", message: "database_unavailable" },
        });
      }
    }
  );

  // -------------------------------------------------------------------------
  // POST /api/v1/admin/board/posts/:id/comments — 관리자 댓글/대댓글 등록
  // -------------------------------------------------------------------------
  app.post<{ Params: { id: string }; Body: { body?: string; is_secret?: boolean } }>(
    "/api/v1/admin/board/posts/:id/comments",
    { preHandler: requireAdmin },
    async (req, reply) => {
      const postId = Number(req.params.id);
      const text = String(req.body?.body ?? "").trim();
      if (!Number.isFinite(postId)) {
        return reply.status(400).send({
          error: { code: "VALIDATION_ERROR", message: "잘못된 요청입니다." },
        });
      }
      if (!text) {
        return reply.status(400).send({
          error: { code: "VALIDATION_ERROR", message: "댓글 내용을 입력해 주세요." },
        });
      }
      try {
        const postRes = await pool.query(
          `SELECT id, is_secret FROM board_posts WHERE id = $1 LIMIT 1`,
          [postId]
        );
        if (postRes.rows.length === 0) {
          return reply.status(404).send({
            error: { code: "NOT_FOUND", message: "게시글을 찾을 수 없습니다." },
          });
        }
        // 비밀글 게시글의 댓글은 항상 비공개(비밀) 처리.
        const isSecret = postRes.rows[0].is_secret ? true : !!req.body?.is_secret;
        const ins = await pool.query(
          `INSERT INTO board_comments (board_post_id, author_admin_id, body, is_secret)
           VALUES ($1, $2, $3, $4)
           RETURNING id, created_at`,
          [postId, req.authAdmin!.id, text, isSecret]
        );
        await insertAuditLog(pool, {
          adminId: req.authAdmin!.id,
          targetTable: "board_posts",
          targetId: postId,
          action: "board_comment",
        });
        return reply.status(201).send({
          id: Number(ins.rows[0].id),
          created: true,
          is_secret: isSecret,
        });
      } catch (err) {
        app.log.error(err);
        return reply.status(503).send({
          error: { code: "INTERNAL_ERROR", message: "database_unavailable" },
        });
      }
    }
  );

  // -------------------------------------------------------------------------
  // DELETE /api/v1/admin/board/posts/:id — 게시글 삭제 (board_comments CASCADE)
  // -------------------------------------------------------------------------
  app.delete<{ Params: { id: string } }>(
    "/api/v1/admin/board/posts/:id",
    { preHandler: requireAdmin },
    async (req, reply) => {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        return reply.status(400).send({
          error: { code: "VALIDATION_ERROR", message: "잘못된 요청입니다." },
        });
      }
      try {
        const del = await pool.query(
          `DELETE FROM board_posts WHERE id = $1 RETURNING id, board_type`,
          [id]
        );
        if (del.rows.length === 0) {
          return reply.status(404).send({
            error: { code: "NOT_FOUND", message: "게시글을 찾을 수 없습니다." },
          });
        }
        await insertAuditLog(pool, {
          adminId: req.authAdmin!.id,
          targetTable: "board_posts",
          targetId: id,
          action: "board_delete",
        });
        return { id, deleted: true };
      } catch (err) {
        app.log.error(err);
        return reply.status(503).send({
          error: { code: "INTERNAL_ERROR", message: "database_unavailable" },
        });
      }
    }
  );

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
      if (!WORKFLOW_STATUSES.has(workflowStatus)) {
        return reply.status(400).send({
          error: { code: "VALIDATION_ERROR", message: "유효하지 않은 처리 상태입니다." },
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
