// The booking rules, in one place. Both the public calendar and the AI agent
// go through here, so neither can offer a slot the other would refuse.

import { dayBlock, BlockedDay } from "./hebcal";
import { takenSlots } from "./bookings-store";
import { addDays, dayKey, formatDayLabel, fromWall, hhmm, startOfDay, wallOf } from "./time";

/** Israel-time windows a meeting may start in. */
export const WINDOWS: { from: [number, number]; to: [number, number] }[] = [
  { from: [11, 0], to: [17, 0] },
  { from: [20, 0], to: [23, 0] },
];
export const SLOT_MINUTES = 30;
/** A meeting must be at least this far from the moment it is booked. */
export const MIN_LEAD_HOURS = 14;
/** And no further ahead than this. */
export const HORIZON_DAYS = 14;

export type Slot = { iso: string; time: string };
export type Day = { day: string; label: string; slots: Slot[] };

export type Unavailable =
  | { ok: false; reason: "too-soon" | "too-far" | "outside-hours" | "taken" | "blocked" | "invalid"; message: string };
export type SlotCheck = { ok: true } | Unavailable;

export function earliestStart(now: Date): Date {
  return new Date(now.getTime() + MIN_LEAD_HOURS * 60 * 60 * 1000);
}

export function latestStart(now: Date): Date {
  // End of the last day inside the horizon, so "two weeks ahead" means the
  // whole day and not the exact minute.
  return addDays(startOfDay(now), HORIZON_DAYS + 1);
}

function blockedMessage(block: BlockedDay, locale: string): string {
  if (locale === "en") {
    if (block.reason === "shabbat") return "We do not hold meetings on Shabbat.";
    if (block.reason === "yomtov") return `We do not hold meetings on ${block.label || "a holiday"}.`;
    return "We do not hold meetings on the eve of Shabbat or a holiday.";
  }
  if (block.reason === "shabbat") return "אנחנו לא קובעים פגישות בשבת.";
  if (block.reason === "yomtov") return `אנחנו לא קובעים פגישות ב${block.label || "חג"}.`;
  return "אנחנו לא קובעים פגישות בערב שבת או ערב חג.";
}

/** Every slot start of a given Israel calendar day, ignoring all other rules. */
function slotsOfDay(date: Date): Date[] {
  const w = wallOf(date);
  const out: Date[] = [];
  for (const win of WINDOWS) {
    const startMin = win.from[0] * 60 + win.from[1];
    const endMin = win.to[0] * 60 + win.to[1];
    for (let m = startMin; m + SLOT_MINUTES <= endMin; m += SLOT_MINUTES) {
      out.push(fromWall(w.year, w.month, w.day, Math.floor(m / 60), m % 60));
    }
  }
  return out;
}

function withinWindows(date: Date): boolean {
  const w = wallOf(date);
  const minutes = w.hour * 60 + w.minute;
  if (minutes % SLOT_MINUTES !== 0) return false;
  return WINDOWS.some((win) => {
    const s = win.from[0] * 60 + win.from[1];
    const e = win.to[0] * 60 + win.to[1];
    return minutes >= s && minutes + SLOT_MINUTES <= e;
  });
}

/**
 * The calendar the visitor sees: only days that have at least one bookable slot.
 */
export async function availableDays(now = new Date(), locale = "he"): Promise<Day[]> {
  const first = earliestStart(now);
  const last = latestStart(now);
  const taken = await takenSlots(first, last);
  const days: Day[] = [];

  for (let i = 0; i <= HORIZON_DAYS; i++) {
    const date = addDays(startOfDay(now), i);
    if (await dayBlock(date, now, HORIZON_DAYS)) continue;
    const slots = slotsOfDay(date)
      .filter((s) => s.getTime() >= first.getTime() && s.getTime() <= last.getTime())
      .filter((s) => !taken.has(s.toISOString()))
      .map((s) => ({ iso: s.toISOString(), time: hhmm(s) }));
    if (slots.length) days.push({ day: dayKey(date), label: formatDayLabel(date, locale), slots });
  }
  return days;
}

/** Re-checks a slot at submit time. The calendar is a hint; this is the gate. */
export async function checkSlot(iso: string, now = new Date(), locale = "he"): Promise<SlotCheck> {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) {
    return { ok: false, reason: "invalid", message: locale === "en" ? "Invalid time." : "מועד לא תקין." };
  }
  const slot = new Date(t);

  if (slot.getTime() < earliestStart(now).getTime()) {
    return {
      ok: false,
      reason: "too-soon",
      message:
        locale === "en"
          ? `A meeting must be booked at least ${MIN_LEAD_HOURS} hours in advance.`
          : `אפשר לקבוע פגישה לפחות ${MIN_LEAD_HOURS} שעות מראש.`,
    };
  }
  if (slot.getTime() > latestStart(now).getTime()) {
    return {
      ok: false,
      reason: "too-far",
      message:
        locale === "en"
          ? "The calendar is open up to two weeks ahead."
          : "היומן פתוח עד שבועיים קדימה.",
    };
  }
  if (!withinWindows(slot)) {
    return {
      ok: false,
      reason: "outside-hours",
      message:
        locale === "en"
          ? "Meeting hours are 11:00–17:00 and 20:00–23:00 (Israel time)."
          : "שעות הפגישות הן 11:00–17:00 ו־20:00–23:00 (שעון ישראל).",
    };
  }
  const block = await dayBlock(slot, now, HORIZON_DAYS);
  if (block) return { ok: false, reason: "blocked", message: blockedMessage(block, locale) };

  const taken = await takenSlots(new Date(slot.getTime() - 1000), new Date(slot.getTime() + 1000));
  if (taken.has(slot.toISOString())) {
    return {
      ok: false,
      reason: "taken",
      message: locale === "en" ? "That slot was just taken. Please pick another." : "המועד הזה נתפס כרגע. אפשר לבחור אחר.",
    };
  }
  return { ok: true };
}
