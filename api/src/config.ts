import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 3000),
  appEnv: process.env.APP_ENV ?? "development",
  databaseUrl: process.env.DATABASE_URL ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "dev-insecure-secret",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? "dev-insecure-refresh",
  jwtAccessExpires: process.env.JWT_ACCESS_EXPIRES ?? "15m",
  jwtRefreshExpires: process.env.JWT_REFRESH_EXPIRES ?? "7d",
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:5500,https://topik-myanmar.vercel.app")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
};
