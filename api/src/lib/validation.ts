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
