import { config } from "../config.js";

/**
 * Pluggable mailer.
 *
 * MAIL_PROVIDER:
 *   - "resend"  → transactional API (only needs RESEND_API_KEY). Uses global fetch.
 *   - "smtp"    → classic SMTP via nodemailer (optional dependency, dynamically imported).
 *   - "console" → dev fallback: logs the message, never actually sends. (default)
 *
 * The console fallback keeps signup / password-reset working locally with NO credentials.
 * To go live, set MAIL_PROVIDER + the matching credentials (see .env.example).
 */

export type MailerMode = "smtp" | "resend" | "console";

export interface MailInput {
  to: string;
  subject: string;
  html: string;
}

interface Querier {
  query: (text: string, params?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>;
}

export function mailerMode(): MailerMode {
  const p = config.mail.provider;
  if (p === "resend" && config.mail.resendApiKey) return "resend";
  if (p === "smtp" && config.mail.smtp.host) return "smtp";
  return "console";
}

/** True when a real provider (not the dev console fallback) is configured. */
export function isMailerLive(): boolean {
  return mailerMode() !== "console";
}

export async function sendMail(
  input: MailInput
): Promise<{ ok: boolean; error?: string }> {
  const mode = mailerMode();
  try {
    if (mode === "resend") {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.mail.resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: config.mail.from,
          to: [input.to],
          subject: input.subject,
          html: input.html,
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return { ok: false, error: `resend_${res.status}:${text.slice(0, 200)}` };
      }
      return { ok: true };
    }

    if (mode === "smtp") {
      // Optional dependency — degrade gracefully if not installed.
      // Non-literal specifier so TS doesn't require nodemailer types at build time.
      const specifier = "nodemailer";
      const mod = await import(specifier).catch(() => null);
      const nodemailer: {
        createTransport: (opts: unknown) => { sendMail: (m: unknown) => Promise<unknown> };
      } | null = mod ? (mod.default ?? mod) : null;
      if (!nodemailer) {
        return { ok: false, error: "nodemailer_not_installed" };
      }
      const transport = nodemailer.createTransport({
        host: config.mail.smtp.host,
        port: config.mail.smtp.port,
        secure: config.mail.smtp.secure,
        auth: config.mail.smtp.user
          ? { user: config.mail.smtp.user, pass: config.mail.smtp.pass }
          : undefined,
      });
      await transport.sendMail({
        from: config.mail.from,
        to: input.to,
        subject: input.subject,
        html: input.html,
      });
      return { ok: true };
    }

    // console fallback (dev)
    // eslint-disable-next-line no-console
    console.log(
      `[mailer:console] (not delivered) to=${input.to} subject="${input.subject}"`
    );
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Persist an email to email_outbox, attempt delivery, then update the row status.
 * Returns whether the message was actually sent (false in console/dev mode is still "queued").
 */
export async function queueAndSend(
  db: Querier,
  opts: {
    templateKey: string;
    locale?: string;
    toEmail: string;
    subject: string;
    html: string;
    userId?: number | null;
  }
): Promise<{ outboxId: number; sent: boolean }> {
  const locale = ["ko", "my", "en"].includes(opts.locale ?? "ko")
    ? (opts.locale as string)
    : "ko";

  const ins = await db.query(
    `INSERT INTO email_outbox (
       template_key, locale, to_email, user_id, subject, body_html, status
     ) VALUES ($1, $2, $3, $4, $5, $6, 'queued')
     RETURNING id`,
    [opts.templateKey, locale, opts.toEmail, opts.userId ?? null, opts.subject, opts.html]
  );
  const outboxId = Number(ins.rows[0].id);

  const result = await sendMail({
    to: opts.toEmail,
    subject: opts.subject,
    html: opts.html,
  });

  await db.query(
    `UPDATE email_outbox SET status = $1, sent_at = $2 WHERE id = $3`,
    [result.ok ? "sent" : "failed", result.ok ? new Date() : null, outboxId]
  );

  return { outboxId, sent: result.ok };
}
