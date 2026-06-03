import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { pool } from "../db.js";
import { verifyAccessToken, verifyAdminAccessToken } from "../lib/auth.js";
import { resolveFile, type FileRow } from "../lib/storage.js";

/**
 * Authenticated file streaming.
 *
 * GET /api/v1/files/:id        — owner (FO user) or any active admin
 * GET /api/v1/admin/files/:id  — any active admin (BO grid thumbnails / 사진심사)
 *
 * Token may arrive via `Authorization: Bearer` OR `?token=` query param, since
 * <img src> cannot set an Authorization header. Access control:
 *   - admin token (any role, incl. readonly) → may view any file
 *   - user token → may view only files they own (owner_id === user id)
 */

interface ViewerInfo {
  isAdmin: boolean;
  userId: number | null;
}

function extractToken(req: FastifyRequest): string | null {
  const header = req.headers.authorization;
  if (header) {
    const m = /^Bearer\s+(\S+)$/i.exec(header);
    if (m) return m[1];
  }
  const q = (req.query as { token?: string; access_token?: string }) ?? {};
  return q.token ?? q.access_token ?? null;
}

async function resolveViewer(
  req: FastifyRequest,
  opts: { adminOnly: boolean }
): Promise<ViewerInfo | null> {
  const token = extractToken(req);
  if (!token) return null;

  const adminPayload = verifyAdminAccessToken(token);
  if (adminPayload) {
    const adminId = Number(adminPayload.sub.replace(/^admin:/, ""));
    if (!Number.isFinite(adminId) || adminId <= 0) return null;
    const { rows } = await pool.query(
      `SELECT id FROM admin_users WHERE id = $1 AND is_active = true LIMIT 1`,
      [adminId]
    );
    if (rows.length === 0) return null;
    return { isAdmin: true, userId: null };
  }

  if (opts.adminOnly) return null;

  const userPayload = verifyAccessToken(token);
  if (userPayload) {
    const userId = Number(userPayload.sub);
    if (!Number.isFinite(userId) || userId <= 0) return null;
    return { isAdmin: false, userId };
  }
  return null;
}

async function serveFile(
  req: FastifyRequest,
  reply: FastifyReply,
  fileId: number,
  viewer: ViewerInfo
) {
  const { rows } = await pool.query(
    `SELECT id, owner_type, owner_id, storage_key, original_filename,
            mime_type, size_bytes
     FROM file_attachments WHERE id = $1 LIMIT 1`,
    [fileId]
  );
  if (rows.length === 0) {
    return reply.status(404).send({
      error: { code: "NOT_FOUND", message: "파일을 찾을 수 없습니다." },
    });
  }
  const row = rows[0] as unknown as FileRow;

  if (!viewer.isAdmin) {
    // FO user may only access their own photo.
    if (row.owner_type !== "user_photo" || Number(row.owner_id) !== viewer.userId) {
      return reply.status(403).send({
        error: { code: "FORBIDDEN", message: "접근 권한이 없습니다." },
      });
    }
  }

  const resolved = await resolveFile(row);
  if (!resolved) {
    return reply.status(404).send({
      error: {
        code: "FILE_UNAVAILABLE",
        message: "저장된 파일을 찾을 수 없습니다. (레거시 stub 또는 누락)",
      },
    });
  }

  reply.header("Cache-Control", "private, max-age=60");
  if (resolved.kind === "redirect" && resolved.redirectUrl) {
    return reply.redirect(resolved.redirectUrl);
  }
  reply.header(
    "Content-Disposition",
    `inline; filename="${encodeURIComponent(resolved.filename)}"`
  );
  reply.type(resolved.mime);
  if (resolved.kind === "buffer" && resolved.buffer) {
    return reply.send(resolved.buffer);
  }
  return reply.send(resolved.stream);
}

export async function filesRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>(
    "/api/v1/files/:id",
    async (req, reply) => {
      const fileId = Number(req.params.id);
      if (!Number.isFinite(fileId)) {
        return reply.status(400).send({
          error: { code: "VALIDATION_ERROR", message: "잘못된 요청입니다." },
        });
      }
      const viewer = await resolveViewer(req, { adminOnly: false });
      if (!viewer) {
        return reply.status(401).send({
          error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." },
        });
      }
      return serveFile(req, reply, fileId, viewer);
    }
  );

  app.get<{ Params: { id: string } }>(
    "/api/v1/admin/files/:id",
    async (req, reply) => {
      const fileId = Number(req.params.id);
      if (!Number.isFinite(fileId)) {
        return reply.status(400).send({
          error: { code: "VALIDATION_ERROR", message: "잘못된 요청입니다." },
        });
      }
      const viewer = await resolveViewer(req, { adminOnly: true });
      if (!viewer) {
        return reply.status(401).send({
          error: { code: "UNAUTHORIZED", message: "관리자 로그인이 필요합니다." },
        });
      }
      return serveFile(req, reply, fileId, viewer);
    }
  );
}
