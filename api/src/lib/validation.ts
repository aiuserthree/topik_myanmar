export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPassword(pw: string): boolean {
  if (pw.length < 8) return false;
  if (!/[A-Za-z]/.test(pw)) return false;
  if (!/\d/.test(pw)) return false;
  if (!/[^A-Za-z0-9]/.test(pw)) return false;
  return true;
}

export function normalizeBirthDate(raw: string): string | null {
  const d = String(raw).replace(/\D/g, "");
  if (d.length !== 8) return null;
  const y = Number(d.slice(0, 4));
  const m = Number(d.slice(4, 6));
  const day = Number(d.slice(6, 8));
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || day < 1 || day > 31) return null;
  return d;
}

export function genderToCode(raw: string): "1" | "2" | null {
  const v = String(raw).trim();
  if (v === "1" || v === "남") return "1";
  if (v === "2" || v === "여") return "2";
  return null;
}

/** Parse a date/datetime string into a Date, or null if absent/invalid. */
export function parseDateOrNull(raw: unknown): Date | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const d = new Date(String(raw));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Coerce to a finite integer within [min, max], or null if not parseable. */
export function parseIntInRange(
  raw: unknown,
  min: number,
  max: number
): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
  if (n < min || n > max) return null;
  return n;
}

/** Trimmed non-empty string capped at maxLen, or null. */
export function cleanString(raw: unknown, maxLen: number): string | null {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  return s.slice(0, maxLen);
}
