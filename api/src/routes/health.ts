import type { FastifyInstance } from "fastify";
import { pingDb } from "../db.js";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({
    status: "ok",
    env: process.env.APP_ENV ?? "development",
    timestamp: new Date().toISOString(),
  }));

  app.get("/health/db", async (_req, reply) => {
    try {
      const ok = await pingDb();
      if (!ok) {
        return reply.status(503).send({
          status: "error",
          db: "unconfigured",
        });
      }
      return { status: "ok", db: "connected" };
    } catch (err) {
      app.log.error(err);
      return reply.status(503).send({
        status: "error",
        db: "unreachable",
      });
    }
  });
}
