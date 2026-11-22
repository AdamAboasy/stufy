/** Local-date helpers. All dates are ISO strings (YYYY-MM-DD) in the user's local time zone. */

const pad = (n: number) => String(n).padStart(2, "0");

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISODate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return date;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDays(iso: string, days: number): string {
  const date = parseISODate(iso) ?? new Date();
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

export function formatDate(iso: string, lang: "ar" | "en"): string {
  const date = parseISODate(iso);
  if (!date) return iso;
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

/** Localised weekday name for a JS weekday index (0 = Sunday). */
export function weekdayName(index: number, lang: "ar" | "en"): string {
  // 2023-01-01 was a Sunday.
  const date = new Date(2023, 0, 1 + index);
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-GB", { weekday: "long" }).format(date);
}
