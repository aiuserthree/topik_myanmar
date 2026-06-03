import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "./config.js";
import { healthRoutes } from "./routes/health.js";
import { examRoundsRoutes } from "./routes/exam-rounds.js";
import { examVenuesRoutes } from "./routes/exam-venues.js";
import { authRoutes } from "./routes/auth.js";
import { authGoogleRoutes } from "./routes/auth-google.js";
import { meRoutes } from "./routes/me.js";
import { applicationSubmissionsRoutes } from "./routes/application-submissions.js";
import { applicationsRoutes } from "./routes/applications.js";
import { authSignupRoutes } from "./routes/auth-signup.js";
import { authPasswordRoutes } from "./routes/auth-password.js";
import { noticesRoutes } from "./routes/notices.js";
import { faqRoutes } from "./routes/faq.js";
import { boardRoutes } from "./routes/board.js";

const app = Fastify({ logger: true });

// Allow any https://*.vercel.app origin (covers Vercel preview deploy URLs like
// topik-myanmar-git-xyz.vercel.app) in addition to the exact CORS_ORIGINS list.
function isVercelPreview(origin: string): boolean {
  try {
    const url = new URL(origin);
    return url.protocol === "https:" && url.hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

await app.register(cors, {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (config.corsOrigins.includes(origin)) return cb(null, true);
    if (isVercelPreview(origin)) return cb(null, true);
    if (
      config.appEnv === "development" &&
      (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1"))
    ) {
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
await app.register(authGoogleRoutes);
await app.register(authSignupRoutes);
await app.register(authPasswordRoutes);
await app.register(meRoutes);
await app.register(applicationSubmissionsRoutes);
await app.register(applicationsRoutes);
await app.register(noticesRoutes);
await app.register(faqRoutes);
await app.register(boardRoutes);

try {
  await app.listen({ port: config.port, host: "0.0.0.0" });
  app.log.info(`API listening on http://0.0.0.0:${config.port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
