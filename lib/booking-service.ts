// One path to a booked meeting, used by both the public form and the AI agent.
// Whatever books a meeting goes through here, so the rules, the emails and the
// reminder can never drift apart between the two.

import { checkSlot, clashes, STEP_MINUTES } from "./availability";
import { formatSlot, dayKey } from "./time";
import { saveBooking, bookingsInRange, dropBooking, Booking } from "./bookings-store";
import { sendBookingConfirmation, sendBookingBrief } from "./resend";
import { businessBrief, researchLinks } from "./llm/research";
import { ensureReminderLoop } from "./reminders";
import { withLock } from "./slot-lock";
import { createMeetEvent, deleteEvent } from "./google-calendar";

export type BookingRequest = {
  slot: string;
  name: string;
  phone: string;
  email: string;
  business: string;
  field?: string;
  topic: string;
  locale: string;
  source: "site" | "agent";
};

export type BookingResult =
  | { ok: true; booking: Booking }
  | { ok: false; reason: string; error: string };

function takenError(locale: string): string {
  return locale === "en"
    ? "That slot was just taken. Please pick another."
    : "המועד הזה נתפס כרגע. אפשר לבחור אחר.";
}

/**
 * The owner's copy carries an AI brief on the business, which costs a few
 * seconds of model time. That happens after the visitor already has an answer —
 * it must never be the reason a booking feels slow, or fails.
 */
function sendOwnerBrief(booking: Booking): void {
  (async () => {
    const input = {
      business: booking.business,
      field: booking.field,
      topic: booking.topic,
      locale: booking.locale,
    };
    const brief = await businessBrief(input).catch((err) => {
      console.error("[booking] brief failed", err);
      return null;
    });
    const sent = await sendBookingBrief(booking, brief, researchLinks(input));
    if (!sent) console.error("[booking] owner email failed", { slot: booking.slotISO });
  })().catch((err) => console.error("[booking] owner notification failed", err));
}

/**
 * Did someone else get this time first? Only meaningful across processes — one
 * process is already serialized by the lock — but a second instance would not
 * be, and Airtable has no unique constraint to lean on. Earliest createdAt wins,
 * with the record id breaking a tie so both sides reach the same verdict.
 */
async function lostTheRace(mine: Booking): Promise<boolean> {
  const start = Date.parse(mine.slotISO);
  const others = await bookingsInRange(
    new Date(start - STEP_MINUTES * 60_000),
    new Date(start + STEP_MINUTES * 60_000)
  );
  return others.some((other) => {
    if (other.slotISO === mine.slotISO && other.id === mine.id) return false;
    if (!clashes(Date.parse(other.slotISO), start)) return false;
    if (other.createdAt !== mine.createdAt) return other.createdAt < mine.createdAt;
    return (other.id || "") < (mine.id || "");
  });
}

export async function createBooking(req: BookingRequest): Promise<BookingResult> {
  const slot = new Date(req.slot);
  if (!Number.isFinite(slot.getTime())) {
    return {
      ok: false,
      reason: "invalid",
      error: req.locale === "en" ? "Invalid time." : "מועד לא תקין.",
    };
  }

  // Checking and taking the slot has to be one indivisible step, or two people
  // who click at the same moment both see it free.
  return withLock(dayKey(slot), async () => {
    const now = new Date();
    const check = await checkSlot(req.slot, now, req.locale);
    if (!check.ok) return { ok: false, reason: check.reason, error: check.message };

    const booking: Booking = {
      slotISO: slot.toISOString(),
      slotLabel: formatSlot(slot, req.locale),
      name: req.name,
      phone: req.phone,
      email: req.email,
      business: req.business,
      field: req.field || "",
      topic: req.topic,
      locale: req.locale,
      source: req.source,
      createdAt: now.toISOString(),
    };

    // The Meet link is part of the confirmation, so it has to exist before the
    // email goes out — but never at the cost of the booking itself.
    const meeting = await createMeetEvent({
      start: slot,
      business: booking.business,
      name: booking.name,
      email: booking.email,
      phone: booking.phone,
      topic: booking.topic,
      field: booking.field,
    });
    if (meeting) {
      booking.meetLink = meeting.meetLink;
      booking.googleEventId = meeting.eventId;
    }

    const saved = await saveBooking(booking);
    const stored: Booking = { ...booking, id: saved.id };

    if (await lostTheRace(stored)) {
      // Another instance wrote the same time first. Undo ours completely rather
      // than leave a ghost meeting in the calendar.
      await dropBooking(stored);
      if (stored.googleEventId) await deleteEvent(stored.googleEventId);
      return { ok: false, reason: "taken", error: takenError(req.locale) };
    }

    const confirmed = await sendBookingConfirmation(stored);

    if (!saved.ok && !confirmed) {
      console.error("[booking] LOST — nothing stored and no email sent", { slot: stored.slotISO });
      return {
        ok: false,
        reason: "delivery",
        error:
          req.locale === "en"
            ? "We could not record the meeting. Please message us on WhatsApp and we will set it up."
            : "לא הצלחנו לקלוט את הפגישה. אפשר לכתוב לנו בוואטסאפ ונתאם.",
      };
    }

    sendOwnerBrief(stored);
    ensureReminderLoop();
    return { ok: true, booking: stored };
  });
}
