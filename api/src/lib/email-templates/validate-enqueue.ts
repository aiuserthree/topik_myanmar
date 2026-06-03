import { renderEmail, TEMPLATE_KEYS, templateSupportsLocale } from "./render-html.js";
import { buildEmailDefaults } from "./defaults.js";
import type { EmailVariables, TemplateKey } from "./types.js";

/** Legacy / spec alias → canonical template_key */
const TEMPLATE_ALIASES: Record<string, TemplateKey> = {
  inquiry_answered: "board_reply",
};

const ALLOWED_KEYS = new Set<string>(TEMPLATE_KEYS);

export function resolveTemplateKey(raw: string): TemplateKey | null {
  const key = raw.trim();
  if (!key) return null;
  const aliased = TEMPLATE_ALIASES[key] ?? key;
  return ALLOWED_KEYS.has(aliased) ? (aliased as TemplateKey) : null;
}

export function listAllowedTemplateKeys(): TemplateKey[] {
  return [...TEMPLATE_KEYS];
}

export interface ValidateEnqueueResult {
  ok: true;
  templateKey: TemplateKey;
  locale: "ko" | "my" | "en";
  variables: EmailVariables;
  subject: string;
}

export interface ValidateEnqueueError {
  ok: false;
  code: string;
  message: string;
  allowed_keys?: TemplateKey[];
}

function normalizeLocale(locale?: string): "ko" | "my" | "en" {
  const loc = (locale ?? "ko").toLowerCase();
  return loc === "my" || loc === "en" ? loc : "ko";
}

/**
 * Resolve alias, validate template_key, locale, and render (dry-run) before enqueue.
 */
export function validateEnqueuePayload(opts: {
  templateKey: string;
  locale?: string;
  variables?: EmailVariables;
}): ValidateEnqueueResult | ValidateEnqueueError {
  const resolved = resolveTemplateKey(opts.templateKey);
  if (!resolved) {
    return {
      ok: false,
      code: "INVALID_TEMPLATE_KEY",
      message: `Unknown template_key "${opts.templateKey}". Must be one of the 14 transactional keys (inquiry_answered aliases to board_reply).`,
      allowed_keys: listAllowedTemplateKeys(),
    };
  }

  const locale = normalizeLocale(opts.locale);
  if (!templateSupportsLocale(resolved, locale)) {
    return {
      ok: false,
      code: "UNSUPPORTED_LOCALE",
      message: `Template "${resolved}" does not support locale "${locale}".`,
    };
  }

  const variables = buildEmailDefaults(opts.variables ?? {});

  try {
    const { subject } = renderEmail(resolved, locale, variables);
    return { ok: true, templateKey: resolved, locale, variables, subject };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      code: "RENDER_FAILED",
      message: `Failed to render template "${resolved}": ${msg}`,
    };
  }
}
