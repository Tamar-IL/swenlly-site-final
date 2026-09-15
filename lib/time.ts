// Everything about this booking system happens in Israel time, on a server that
// is almost certainly running UTC. These helpers are the only place that knows
// how to cross between the two, so nothing else has to guess about DST.

export const TZ = "Asia/Jerusalem";

export type Wall = {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  /** 0 = Sunday … 6 = Saturday, in Israel time. */
  weekday: number;
};

const PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  weekday: "short",
});

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Reads an instant as Israel wall-clock time. */
export function wallOf(date: Date): Wall {
  const found: Record<string, string> = {};
  for (const p of PARTS.formatToParts(date)) found[p.type] = p.value;
  return {
    year: Number(found.year),
    month: Number(found.month),
    day: Number(found.day),
    hour: Number(found.hour),
    minute: Number(found.minute),
    weekday: Math.max(0, WEEKDAYS.indexOf(found.weekday)),
  };
}

/** Israel's offset from UTC, in minutes, at a given instant (+120 or +180). */
function offsetMinutes(date: Date): number {
  const w = wallOf(date);
  const seconds = Number(
    PARTS.formatToParts(date).find((p) => p.type === "second")?.value ?? "0"
  );
  const asUTC = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, seconds);
  return (asUTC - date.getTime()) / 60_000;
}

/**
 * Turns an Israel wall-clock time into the instant it refers to.
 * Applied twice because the offset itself depends on the instant — one pass is
 * wrong for the two hours a year that straddle a DST change.
 */
export function fromWall(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0
): Date {
  const naive = Date.UTC(year, month - 1, day, hour, minute);
  const first = new Date(naive - offsetMinutes(new Date(naive)) * 60_000);
  return new Date(naive - offsetMinutes(first) * 60_000);
}

/** "2026-09-20" for the Israel calendar day an instant falls on. */
export function dayKey(date: Date): string {
  const w = wallOf(date);
  return `${w.year}-${String(w.month).padStart(2, "0")}-${String(w.day).padStart(2, "0")}`;
}

/** Midnight (Israel) of the calendar day an instant falls on. */
export function startOfDay(date: Date): Date {
  const w = wallOf(date);
  return fromWall(w.year, w.month, w.day);
}

/** Adds whole calendar days in Israel time — DST-safe, unlike +86400000. */
export function addDays(date: Date, days: number): Date {
  const w = wallOf(date);
  return fromWall(w.year, w.month, w.day + days, w.hour, w.minute);
}

/** "YYYY-MM-DD" → the Israel-time midnight it names. */
export function parseDayKey(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key.trim());
  if (!m) return null;
  return fromWall(Number(m[1]), Number(m[2]), Number(m[3]));
}

export function hhmm(date: Date): string {
  const w = wallOf(date);
  return `${String(w.hour).padStart(2, "0")}:${String(w.minute).padStart(2, "0")}`;
}

const HE_DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

/** Human date+time in Israel time, e.g. "יום ראשון, 20.09.2026, 11:30". */
export function formatSlot(date: Date, locale = "he"): string {
  const w = wallOf(date);
  const d = `${String(w.day).padStart(2, "0")}.${String(w.month).padStart(2, "0")}.${w.year}`;
  const t = hhmm(date);
  if (locale === "en") {
    const name = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "long" }).format(date);
    return `${name}, ${d}, ${t} (Israel time)`;
  }
  return `יום ${HE_DAYS[w.weekday]}, ${d}, ${t} (שעון ישראל)`;
}

/** Day label for the date picker, e.g. "יום ג׳ · 22.09". */
export function formatDayLabel(date: Date, locale = "he"): string {
  const w = wallOf(date);
  const d = `${String(w.day).padStart(2, "0")}.${String(w.month).padStart(2, "0")}`;
  if (locale === "en") {
    const name = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short" }).format(date);
    return `${name} · ${d}`;
  }
  return `יום ${HE_DAYS[w.weekday]} · ${d}`;
}
