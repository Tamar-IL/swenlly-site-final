// The hour-before reminder.
//
// A sweep, not a per-booking timer: a timer dies with the process, and a
// container restart the afternoon before a meeting would silently swallow the
// reminder. The sweep runs inside the Node server every few minutes and is also
// exposed at /api/cron/reminders for an external scheduler.

import { dueReminders, markReminderSent, Booking } from "./bookings-store";
import { sendReminder } from "./resend";

const SWEEP_MS = 5 * 60 * 1000;
/** A meeting this far out gets its reminder. Wide enough to absorb a missed
 *  sweep or a restart, narrow enough that "in about an hour" stays true. */
const DUE_FROM_MS = 45 * 60 * 1000;
const DUE_TO_MS = 70 * 60 * 1000;

export type SweepResult = { checked: number; sent: number };

export async function sweepReminders(now = new Date()): Promise<SweepResult> {
  const from = new Date(now.getTime() + DUE_FROM_MS);
  const to = new Date(now.getTime() + DUE_TO_MS);
  let bookings: Booking[] = [];
  try {
    bookings = await dueReminders(from, to);
  } catch (err) {
    console.error("[reminders] lookup failed", err);
    return { checked: 0, sent: 0 };
  }

  let sent = 0;
  for (const b of bookings) {
    try {
      const [client, owner] = await Promise.all([
        b.email ? sendReminder(b, "client") : Promise.resolve(false),
        sendReminder(b, "owner"),
      ]);
      // Only retire the booking once someone was actually reminded — a transient
      // Resend failure should be retried by the next sweep, not forgotten.
      if (client || owner) {
        await markReminderSent(b);
        sent++;
      } else {
        console.error("[reminders] both sends failed", { slot: b.slotISO });
      }
    } catch (err) {
      console.error("[reminders] send failed", err);
    }
  }
  return { checked: bookings.length, sent };
}

// One loop per process, kept on globalThis so Next's dev-mode module reloads do
// not stack up a new interval on every edit.
const KEY = Symbol.for("swenlly.reminderLoop");
type Holder = { [KEY]?: NodeJS.Timeout };

export function ensureReminderLoop(): void {
  const holder = globalThis as unknown as Holder;
  if (holder[KEY]) return;
  const timer = setInterval(() => {
    sweepReminders().catch((err) => console.error("[reminders] sweep error", err));
  }, SWEEP_MS);
  // Never hold the process open just for this.
  timer.unref?.();
  holder[KEY] = timer;
}
