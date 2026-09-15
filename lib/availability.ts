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
/** How long a meeting itself runs. */
export const SLOT_MINUTES = 30;
/** Quiet time after every meeting. Nothing may start inside it, so starts sit
 *  on a SLOT_MINUTES + BREAK_MINUTES grid from the top of each window. */
export const BREAK_MINUTES = 15;
/** Distance between two consecutive starts. */
export const STEP_MINUTES = SLOT_MINUTES + BREAK_MINUTES;
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
    // The break only has to fit between two meetings, not after the last one,
    // so the window has room for a meeting that ends exactly at its close.
    for (let m = startMin; m + SLOT_MINUTES <= endMin; m += STEP_MINUTES) {
      out.push(fromWall(w.year, w.month, w.day, Math.floor(m / 60), m % 60));
    }
  }
  return out;
}

function withinWindows(date: Date): boolean {
  const w = wallOf(date);
  const minutes = w.hour * 60 + w.minute;
  return WINDOWS.some((win) => {
    const s = win.from[0] * 60 + win.from[1];
    const e = win.to[0] * 60 + win.to[1];
    if (minutes < s || minutes + SLOT_MINUTES > e) return false;
    // On the grid, not merely inside the window: an off-grid start would eat
    // into the break around its neighbours.
    return (minutes - s) % STEP_MINUTES === 0;
  });
}

/** Two meetings clash when the gap between their starts leaves no room for the
 *  meeting plus its break. Used everywhere instead of comparing exact starts. */
export function clashes(aStartMs: number, bStartMs: number): boolean {
  return Math.abs(aStartMs - bStartMs) < STEP_MINUTES * 60_000;
}

/**
 * The calendar the visitor sees: only days that have at least one bookable slot.
 */
export async function availableDays(now = new Date(), locale = "he"): Promise<Day[]> {
  const first = earliestStart(now);
  const last = latestStart(now);
  // Pad the lookup: a meeting just outside the window still blocks the slot at
  // its edge, because the break reaches across the boundary.
  const taken = await takenSlots(
    new Date(first.getTime() - STEP_MINUTES * 60_000),
    new Date(last.getTime() + STEP_MINUTES * 60_000)
  );
  const days: Day[] = [];

  for (let i = 0; i <= HORIZON_DAYS; i++) {
    const date = addDays(startOfDay(now), i);
    if (await dayBlock(date, now, HORIZON_DAYS)) continue;
    const slots = slotsOfDay(date)
      .filter((s) => s.getTime() >= first.getTime() && s.getTime() <= last.getTime())
      .filter((s) => !taken.some((t) => clashes(t, s.getTime())))
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
      // Naming only the windows would confuse someone who asked for 11:30 —
      // that IS inside them; what it is not is on the grid the break creates.
      message:
        locale === "en"
          ? `Meetings run ${SLOT_MINUTES} minutes with a ${BREAK_MINUTES}-minute break after each one, so they start every ${STEP_MINUTES} minutes from 11:00 and from 20:00 (Israel time). Please pick a time from the calendar.`
          : `הפגישות הן ${SLOT_MINUTES} דקות עם ${BREAK_MINUTES} דקות הפסקה אחרי כל אחת, ולכן הן מתחילות כל ${STEP_MINUTES} דקות מ־11:00 ומ־20:00 (שעון ישראל). אפשר לבחור מועד מהיומן.`,
    };
  }
  const block = await dayBlock(slot, now, HORIZON_DAYS);
  if (block) return { ok: false, reason: "blocked", message: blockedMessage(block, locale) };

  const taken = await takenSlots(
    new Date(slot.getTime() - STEP_MINUTES * 60_000),
    new Date(slot.getTime() + STEP_MINUTES * 60_000)
  );
  if (taken.some((t) => clashes(t, slot.getTime()))) {
    return {
      ok: false,
      reason: "taken",
      message: locale === "en" ? "That slot was just taken. Please pick another." : "המועד הזה נתפס כרגע. אפשר לבחור אחר.",
    };
  }
  return { ok: true };
}
