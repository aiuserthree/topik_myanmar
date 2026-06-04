import type { Pool, PoolClient } from "pg";

type DbConn = Pick<Pool, "query"> | PoolClient;

export interface CommentNode {
  id: number;
  parent_comment_id: number | null;
  body: string;
  is_secret: boolean;
  is_admin: boolean;
  author: string;
  created_at: Date | string;
  created_at_label: string;
  replies: CommentNode[];
}

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

/** Minimal post fields needed to evaluate read access. */
export interface BoardPostAccess {
  user_id: number | string;
  board_type: string;
  is_secret: boolean;
}

/** Who is asking — an FO member (`id`) and/or an admin (`isAdmin`). */
export interface BoardViewer {
  id?: number | string | null;
  isAdmin?: boolean;
}

/**
 * Single source of truth for "may this viewer read the full post body +
 * comments?". Used by the public detail, list (per-row lock flag), and both
 * comment handlers so visibility never drifts between them.
 *
 * Readable when: viewer is admin, OR viewer is the author, OR the post is a
 * public (non-secret) 문의(inquiry). 환불·정보정정(refund_correction) posts are
 * always secret, so only the author/admin can read them. 문의 비밀글 is
 * author/admin only.
 */
export function canReadBoardPost(post: BoardPostAccess, viewer: BoardViewer): boolean {
  if (viewer?.isAdmin) return true;
  if (
    viewer?.id != null &&
    post.user_id != null &&
    Number(post.user_id) === Number(viewer.id)
  ) {
    return true;
  }
  if (post.board_type === "inquiry" && !post.is_secret) return true;
  return false;
}

/**
 * Load a post's comments as a single-level thread: top-level comments first
 * (chronological), each with their 대댓글 in `replies[]`. Soft-deleted rows are
 * excluded. Shared by the public ({@link boardRoutes}) and admin
 * ({@link adminBoardRoutes}) detail endpoints so both render the same shape.
 */
export async function fetchThreadedComments(
  db: DbConn,
  postId: number
): Promise<CommentNode[]> {
  const { rows } = await db.query(
    `SELECT c.id, c.parent_comment_id, c.body, c.is_secret, c.created_at,
            cu.name_ko AS user_name,
            ca.email AS admin_email, ca.name AS admin_name
     FROM board_comments c
     LEFT JOIN users cu ON cu.id = c.author_user_id
     LEFT JOIN admin_users ca ON ca.id = c.author_admin_id
     WHERE c.board_post_id = $1 AND c.is_deleted = false
     ORDER BY c.created_at ASC, c.id ASC`,
    [postId]
  );

  const nodes: CommentNode[] = rows.map((r) => {
    const isAdmin = !!r.admin_email;
    // Never expose the admin email to FO members — fall back to a generic label.
    const author = isAdmin ? r.admin_name || "관리자" : r.user_name || "—";
    return {
      id: Number(r.id),
      parent_comment_id: r.parent_comment_id != null ? Number(r.parent_comment_id) : null,
      body: r.body,
      is_secret: !!r.is_secret,
      is_admin: isAdmin,
      author,
      created_at: r.created_at,
      created_at_label: formatDateTime(r.created_at),
      replies: [],
    };
  });

  const byId = new Map<number, CommentNode>(nodes.map((n) => [n.id, n]));
  const roots: CommentNode[] = [];
  for (const n of nodes) {
    const parent = n.parent_comment_id != null ? byId.get(n.parent_comment_id) : undefined;
    if (parent) {
      parent.replies.push(n);
    } else {
      // Treat missing-parent (shouldn't happen) as top-level so nothing is hidden.
      roots.push(n);
    }
  }
  return roots;
}

export type ParentCheck =
  | { ok: true }
  | { ok: false; code: string; message: string };

/**
 * Validate a `parent_comment_id` for a new 대댓글: the parent must exist on the
 * same post and must itself be a top-level comment (single-level nesting — a
 * 대댓글 cannot have its own child).
 */
export async function validateParentComment(
  db: DbConn,
  postId: number,
  parentId: number
): Promise<ParentCheck> {
  const { rows } = await db.query(
    `SELECT id, parent_comment_id
     FROM board_comments
     WHERE id = $1 AND board_post_id = $2 AND is_deleted = false
     LIMIT 1`,
    [parentId, postId]
  );
  if (rows.length === 0) {
    return { ok: false, code: "VALIDATION_ERROR", message: "원댓글을 찾을 수 없습니다." };
  }
  if (rows[0].parent_comment_id != null) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "대댓글에는 다시 답글을 달 수 없습니다.",
    };
  }
  return { ok: true };
}
