import type { Pool } from "pg";
import { queueAndSend } from "../mailer.js";
import { buildEmailDefaults } from "./defaults.js";
import { renderEmail } from "./render-html.js";
import type { EmailLocale, EmailVariables, TemplateKey } from "./types.js";

type DbClient = Pick<Pool, "query">;

export interface EnqueueEmailOpts {
  templateKey: TemplateKey | string;
  toEmail: string;
  userId?: number | null;
  locale?: string;
  variables?: EmailVariables;
  /** When true, only enqueue (status 'queued') and let the worker deliver it. */
  deferSend?: boolean;
}

function normalizeLocale(locale?: string): EmailLocale {
  const loc = (locale ?? "ko").toLowerCase();
  return loc === "my" || loc === "en" ? loc : "ko";
}

/**
 * Render a 시안 C안 template and queue it in email_outbox + send via mailer.
 */
export async function enqueueEmail(
  db: DbClient,
  opts: EnqueueEmailOpts
): Promise<{ outboxId: number; sent: boolean; subject: string }> {
  const locale = normalizeLocale(opts.locale);
  const vars = buildEmailDefaults(opts.variables ?? {});
  const { subject, html } = renderEmail(opts.templateKey, locale, vars);

  const result = await queueAndSend(db, {
    templateKey: opts.templateKey,
    locale,
    toEmail: opts.toEmail,
    userId: opts.userId ?? null,
    subject,
    html,
    deferSend: opts.deferSend,
  });

  return { ...result, subject };
}

export { renderEmail, TEMPLATE_KEYS } from "./render-html.js";
export { buildEmailDefaults, formatVerificationCode, maskEmail } from "./defaults.js";
export type { TemplateKey, EmailVariables, EmailLocale } from "./types.js";
