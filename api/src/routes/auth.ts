import bcrypt from "bcrypt";
import type { FastifyInstance } from "fastify";
import { pool } from "../db.js";
import { signAuthTokens as signTokens } from "../lib/auth.js";

interface LoginBody {
  email?: string;
  password?: string;
}

export async function authRoutes(app: FastifyInstance) {
  app.post<{ Body: LoginBody }>("/api/v1/auth/login", async (req, reply) => {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      return reply.status(400).send({ error: "email_and_password_required" });
    }

    try {
      const userResult = await pool.query(
        `SELECT id, email, password_hash, name_ko, name_en, status
         FROM users
         WHERE email = $1 AND status = 'active'
         LIMIT 1`,
        [email]
      );

      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];
        if (!user.password_hash) {
          return reply.status(401).send({ error: "invalid_credentials" });
        }
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
          return reply.status(401).send({ error: "invalid_credentials" });
        }
        const tokens = signTokens({
          sub: String(user.id),
          email: user.email,
          role: "user",
        });
        return {
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
          token_type: "Bearer",
          user: {
            id: user.id,
            email: user.email,
            name_ko: user.name_ko,
            name_en: user.name_en,
            role: "user",
          },
        };
      }

      const adminResult = await pool.query(
        `SELECT id, email, password_hash, name, role
         FROM admin_users
         WHERE email = $1 AND is_active = true
         LIMIT 1`,
        [email]
      );

      if (adminResult.rows.length > 0) {
        const admin = adminResult.rows[0];
        const match = await bcrypt.compare(password, admin.password_hash);
        if (!match) {
          return reply.status(401).send({ error: "invalid_credentials" });
        }
        const tokens = signTokens({
          sub: `admin:${admin.id}`,
          email: admin.email,
          role: "admin",
        });
        return {
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
          token_type: "Bearer",
          user: {
            id: admin.id,
            email: admin.email,
            name: admin.name,
            role: admin.role,
          },
        };
      }

      return reply.status(401).send({ error: "invalid_credentials" });
    } catch (err) {
      app.log.error(err);
      return reply.status(503).send({ error: "database_unavailable" });
    }
  });
}
