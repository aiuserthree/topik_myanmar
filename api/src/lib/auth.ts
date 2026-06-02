import jwt from "jsonwebtoken";
import type { FastifyReply, FastifyRequest } from "fastify";
import { config } from "../config.js";

export interface JwtPayload {
  sub: string;
  email: string;
  role: "user" | "admin";
}

export interface AuthenticatedUser {
  id: number;
  email: string;
  role: "user";
}

declare module "fastify" {
  interface FastifyRequest {
    authUser?: AuthenticatedUser;
  }
}

function parseBearer(header: string | undefined): string | null {
  if (!header) return null;
  const m = /^Bearer\s+(\S+)$/i.exec(header);
  return m ? m[1] : null;
}

export function verifyAccessToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    if (!decoded?.sub || decoded.role !== "user") return null;
    if (decoded.sub.startsWith("admin:")) return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function requireFoUser(req: FastifyRequest, reply: FastifyReply) {
  const token = parseBearer(req.headers.authorization);
  if (!token) {
    return reply.status(401).send({
      error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." },
    });
  }
  const payload = verifyAccessToken(token);
  if (!payload) {
    return reply.status(401).send({
      error: { code: "UNAUTHORIZED", message: "유효하지 않거나 만료된 토큰입니다." },
    });
  }
  const userId = Number(payload.sub);
  if (!Number.isFinite(userId) || userId <= 0) {
    return reply.status(401).send({
      error: { code: "UNAUTHORIZED", message: "유효하지 않은 사용자입니다." },
    });
  }
  req.authUser = { id: userId, email: payload.email, role: "user" };
}
