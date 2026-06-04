import pg from "pg";
import { config } from "./config.js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl || undefined,
  // Keep TCP sockets alive so cloud networks/proxies (Railway) don't silently
  // drop idle connections, which otherwise resurface as "Connection terminated
  // unexpectedly" on the next query handed a dead socket.
  keepAlive: true,
  // Bound the wait when acquiring a connection so a brief DB outage fails fast
  // (→ handled 503) instead of hanging the request indefinitely.
  connectionTimeoutMillis: 10_000,
});

// A Pool emits 'error' on an IDLE client when its backend connection is lost
// (DB restart, network blip, Railway recycling idle connections, connection
// limits). Without a listener node-postgres rethrows it as an uncaught
// exception and the whole process exits — turning a transient DB hiccup into a
// container restart during which every request returns 503. Log and let the
// pool replace the bad client instead of crashing.
pool.on("error", (err) => {
  console.error("[db] idle pool client error (recovering):", err);
});

export async function pingDb(): Promise<boolean> {
  if (!config.databaseUrl) return false;
  const client = await pool.connect();
  try {
    await client.query("SELECT 1");
    return true;
  } finally {
    client.release();
  }
}
