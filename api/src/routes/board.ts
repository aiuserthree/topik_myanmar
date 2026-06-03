import bcrypt from "bcrypt";
import type { FastifyInstance } from "fastify";
import { config } from "../config.js";
import { pool } from "../db.js";
import { requireFoUser } from "../lib/auth.js";
import {
  buildEmailDefaults,
  enqueueEmail,
} from "../lib/email-templates/enqueue-notification.js";

const BOARD_TYPES = new Set(["refund_correction", "inquiry"]);
const STATUS_LABEL: Record<string, string> = {
  received: "접수",
  in_review: "검토중",
  completed: "처리완료",
  rejected: "반려",
  awaiting_reply: "답변대기",
  answered: "답변완료",
};

function formatDateTime(iso: Date | string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}.${m}.${day} ${h}:${min}`;
}

function formatDate(iso: Date | string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

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

async function notifyBoardEmails(opts: {
  boardType: string;
  postId: number;
  title: string;
  category: string | null;
  isSecret: boolean;
  submittedAt: Date;
  userId: number;
}): Promise<void> {
  const userRes = await pool.query(
    `SELECT email, name_ko, preferred_lang FROM users WHERE id = $1 LIMIT 1`,
    [opts.userId]
  );
  const user = userRes.rows[0];
  if (!user) return;

  const locale = String(user.preferred_lang ?? "ko");
  const userName = String(user.name_ko ?? user.email);
  const submittedAt = formatDateTime(opts.submittedAt);
  const postUrl = postDetailUrl(opts.boardType, opts.postId);
  const boardName = BOARD_NAME[opts.boardType] ?? opts.boardType;
  const postIdLabel =
    opts.boardType === "refund_correction"
      ? `R-${new Date().getFullYear()}-${String(opts.postId).padStart(4, "0")}`
      : `Q-${opts.postId}`;

  if (opts.boardType === "refund_correction") {
    await enqueueEmail(pool, {
      templateKey: "board_refund_received",
      toEmail: String(user.email),
      userId: opts.userId,
      locale,
      variables: buildEmailDefaults({
        userName,
        boardName,
        postTitle: opts.title,
        postId: postIdLabel,
        submittedAt,
        postUrl,
      }),
    }).catch(() => undefined);
  }

  const adminTo = config.mail.adminNotifyTo;
  if (adminTo) {
    await enqueueEmail(pool, {
      templateKey: "board_admin_new_post",
      toEmail: adminTo,
      userId: null,
      locale: "ko",
      variables: buildEmailDefaults({
        userName,
        boardName,
        category: opts.category ?? "—",
        postTitle: opts.title,
        submittedAt,
        secretFlag: opts.isSecret ? "예 (비밀글)" : "아니오",
        boPostUrl: `${config.publicBoBase || config.publicFoBase + "/admin"}/board/${opts.postId}`,
      }),
    }).catch(() => undefined);
  }
}

export async function boardRoutes(app: FastifyInstance) {
  app.get<{
    Querystring: { board_type?: string; page?: string; page_size?: string };
  }>(
    "/api/v1/board/posts",
    { preHandler: requireFoUser },
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
      const userId = req.authUser!.id;
      const page = Math.max(1, Number(req.query.page) || 1);
      const pageSize = Math.min(50, Math.max(1, Number(req.query.page_size) || 20));
      const offset = (page - 1) * pageSize;

      try {
        const countRes = await pool.query(
          `SELECT COUNT(*)::int AS total FROM board_posts
           WHERE board_type = $1 AND user_id = $2`,
          [boardType, userId]
        );
        const total = countRes.rows[0]?.total ?? 0;

        const { rows } = await pool.query(
          `SELECT id, category, post_type, title, workflow_status,
                  is_secret, admin_reply, admin_replied_at, created_at
           FROM board_posts
           WHERE board_type = $1 AND user_id = $2
           ORDER BY created_at DESC
           LIMIT $3 OFFSET $4`,
          [boardType, userId, pageSize, offset]
        );

        const items = rows.map((row) => ({
          id: Number(row.id),
          category: row.category,
          post_type: row.post_type,
          title: row.title,
          workflow_status: row.workflow_status,
          status_label: STATUS_LABEL[row.workflow_status] ?? row.workflow_status,
          is_secret: row.is_secret,
          has_reply: !!row.admin_reply,
          admin_replied_at: row.admin_replied_at,
          date_formatted: formatDate(row.created_at),
        }));

        return {
          items,
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

  app.get<{ Params: { id: string } }>(
    "/api/v1/board/posts/:id",
    { preHandler: requireFoUser },
    async (req, reply) => {
      const id = Number(req.params.id);
      const userId = req.authUser!.id;
      if (!Number.isFinite(id)) {
        return reply.status(400).send({
          error: { code: "VALIDATION_ERROR", message: "잘못된 요청입니다." },
        });
      }

      try {
        const { rows } = await pool.query(
          `SELECT p.*, u.name_ko AS author_name
           FROM board_posts p
           INNER JOIN users u ON u.id = p.user_id
           WHERE p.id = $1 AND p.user_id = $2
           LIMIT 1`,
          [id, userId]
        );
        if (rows.length === 0) {
          return reply.status(404).send({
            error: { code: "NOT_FOUND", message: "게시글을 찾을 수 없습니다." },
          });
        }
        const row = rows[0];
        return {
          id: Number(row.id),
          board_type: row.board_type,
          category: row.category,
          post_type: row.post_type,
          title: row.title,
          body: row.body,
          is_secret: row.is_secret,
          workflow_status: row.workflow_status,
          status_label: STATUS_LABEL[row.workflow_status] ?? row.workflow_status,
          admin_reply: row.admin_reply,
          admin_replied_at: row.admin_replied_at,
          author_name: row.author_name,
          date_formatted: formatDate(row.created_at),
        };
      } catch (err) {
        app.log.error(err);
        return reply.status(503).send({
          error: { code: "INTERNAL_ERROR", message: "database_unavailable" },
        });
      }
    }
  );

  app.post<{
    Body: {
      board_type?: string;
      title?: string;
      body?: string;
      category?: string;
      post_type?: string;
      is_secret?: boolean;
      secret_password?: string;
    };
  }>(
    "/api/v1/board/posts",
    { preHandler: requireFoUser },
    async (req, reply) => {
      const userId = req.authUser!.id;
      const body = req.body ?? {};
      const boardType = body.board_type?.trim();
      const title = body.title?.trim();
      const text = body.body?.trim();

      if (!boardType || !BOARD_TYPES.has(boardType)) {
        return reply.status(400).send({
          error: { code: "VALIDATION_ERROR", message: "게시판 유형이 올바르지 않습니다." },
        });
      }
      if (!title || title.length > 100) {
        return reply.status(400).send({
          error: { code: "VALIDATION_ERROR", message: "제목을 100자 이내로 입력해 주세요." },
        });
      }
      if (!text || text.length < 10) {
        return reply.status(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "내용을 10자 이상 입력해 주세요.",
          },
        });
      }

      let secretHash: string | null = null;
      if (body.is_secret) {
        const pw = String(body.secret_password ?? "");
        if (pw.length < 4) {
          return reply.status(400).send({
            error: {
              code: "VALIDATION_ERROR",
              message: "비밀글 비밀번호는 4자 이상이어야 합니다.",
            },
          });
        }
        secretHash = await bcrypt.hash(pw, 10);
      }

      try {
        const ins = await pool.query(
          `INSERT INTO board_posts (
             board_type, user_id, category, post_type, title, body,
             is_secret, secret_password_hash, workflow_status
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'received')
           RETURNING id, created_at`,
          [
            boardType,
            userId,
            body.category?.trim() || null,
            body.post_type?.trim() || null,
            title,
            text,
            !!body.is_secret,
            secretHash,
          ]
        );

        const postId = Number(ins.rows[0].id);
        const createdAt = ins.rows[0].created_at as Date;

        void notifyBoardEmails({
          boardType,
          postId,
          title,
          category: body.category?.trim() || null,
          isSecret: !!body.is_secret,
          submittedAt: createdAt,
          userId,
        });

        return reply.status(201).send({
          id: postId,
          message: "신청이 접수되었습니다.",
          date_formatted: formatDate(ins.rows[0].created_at),
        });
      } catch (err) {
        app.log.error(err);
        return reply.status(503).send({
          error: { code: "INTERNAL_ERROR", message: "database_unavailable" },
        });
      }
    }
  );
}
