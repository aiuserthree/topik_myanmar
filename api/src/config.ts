import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 3000),
  appEnv: process.env.APP_ENV ?? "development",
  databaseUrl: process.env.DATABASE_URL ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "dev-insecure-secret",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? "dev-insecure-refresh",
  jwtAccessExpires: process.env.JWT_ACCESS_EXPIRES ?? "15m",
  jwtRefreshExpires: process.env.JWT_REFRESH_EXPIRES ?? "7d",
  corsOrigins: (
    process.env.CORS_ORIGINS ??
    "http://localhost:5500,http://localhost:8080,http://127.0.0.1:5500,http://127.0.0.1:8080,https://topik-myanmar.vercel.app"
  )
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  // Public FO base used to build deep links inside emails (e.g. password reset)
  publicFoBase: (process.env.PUBLIC_FO_BASE ?? "https://topik-myanmar.vercel.app").replace(/\/$/, ""),
  // Google Sign-In (GIS). Empty clientId = feature disabled (frontend hides button,
  // POST /auth/google → 503). clientSecret unused for ID-token verification but kept
  // for completeness / future server-side OAuth code exchange.
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  },
  // Pluggable mailer. provider = console (dev, logs only) | smtp | resend
  mail: {
    provider: (process.env.MAIL_PROVIDER ?? "console").toLowerCase(),
    from: process.env.MAIL_FROM ?? "TOPIK Myanmar <no-reply@topik-mm.local>",
    resendApiKey: process.env.RESEND_API_KEY ?? "",
    smtp: {
      host: process.env.SMTP_HOST ?? "",
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: String(process.env.SMTP_SECURE ?? "false") === "true",
      user: process.env.SMTP_USER ?? "",
      pass: process.env.SMTP_PASS ?? "",
    },
  },
};
