import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "./config.js";
import { healthRoutes } from "./routes/health.js";
import { examRoundsRoutes } from "./routes/exam-rounds.js";
import { examVenuesRoutes } from "./routes/exam-venues.js";
import { authRoutes } from "./routes/auth.js";

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (config.corsOrigins.includes(origin)) return cb(null, true);
    if (config.appEnv === "development" && origin.startsWith("http://localhost")) {
      return cb(null, true);
    }
    cb(new Error("Not allowed by CORS"), false);
  },
  credentials: true,
});

await app.register(healthRoutes);
await app.register(examRoundsRoutes);
await app.register(examVenuesRoutes);
await app.register(authRoutes);

try {
  await app.listen({ port: config.port, host: "0.0.0.0" });
  app.log.info(`API listening on http://0.0.0.0:${config.port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
