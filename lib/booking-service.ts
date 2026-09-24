// One path to a booked meeting — and to moving or cancelling one. The public
// form, the AI agent and the links in the emails all come through here, so the
// rules, the calendar event and the emails can never drift apart between them.

import { checkSlot } from "./availability";
import { formatSlot, dayKey } from "./time";
import {
  saveBooking,
  updateBooking,
  findByToken,
  newId,
  newToken,
  Booking,
} from "./bookings-store";
import {
  sendBookingConfirmation,
  sendBookingBrief,
  sendRescheduled,
  sendCancelled,
} from "./resend";
import { businessBrief, researchLinks } from "./llm/research";
import { ensureReminderLoop } from "./reminders";
import { withLock } from "./slot-lock";
import { createMeetEvent, moveEvent, deleteEvent } from "./google-calendar";

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

function invalid(locale: string): BookingResult {
  return {
    ok: false,
    reason: "invalid",
    error: locale === "en" ? "Invalid time." : "מועד לא תקין.",
  };
}

function storeFailed(locale: string): BookingResult {
  return {
    ok: false,
    reason: "delivery",
    error:
      locale === "en"
        ? "We could not record the meeting. Please message us on WhatsApp and we will set it up."
        : "לא הצלחנו לקלוט את הפגישה. אפשר לכתוב לנו בוואטסאפ ונתאם.",
  };
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
    if (!sent) console.error("[booking] owner email failed", { id: booking.id });
  })().catch((err) => console.error("[booking] owner notification failed", err));
}

export async function createBooking(req: BookingRequest): Promise<BookingResult> {
  const slot = new Date(req.slot);
  if (!Number.isFinite(slot.getTime())) return invalid(req.locale);

  // Checking and taking the slot has to be one indivisible step, or two people
  // who click at the same moment both see it free.
  return withLock(dayKey(slot), async () => {
    const now = new Date();
    const check = await checkSlot(req.slot, now, req.locale);
    if (!check.ok) return { ok: false, reason: check.reason, error: check.message };

    const booking: Booking = {
      id: newId(),
      token: newToken(),
      status: "confirmed",
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
    if (!saved.ok) {
      // The store is the record. If it did not take the booking, the meeting
      // does not exist, and saying otherwise would strand the visitor.
      if (booking.googleEventId) await deleteEvent(booking.googleEventId);
      return storeFailed(req.locale);
    }

    const confirmed = await sendBookingConfirmation(booking);
    if (!confirmed) {
      // Stored but unannounced: the meeting is real, so keep it and tell the
      // owner. The visitor is told it is booked, which is true.
      console.error("[booking] confirmation email failed", { id: booking.id });
    }

    sendOwnerBrief(booking);
    ensureReminderLoop();
    return { ok: true, booking };
  });
}

// ── Managing an existing meeting ─────────────────────────────────────────────

export type ManageLookup =
  | { ok: true; booking: Booking }
  | { ok: false; reason: "unknown" | "past"; error: string };

function notFound(locale: string): ManageLookup {
  return {
    ok: false,
    reason: "unknown",
    error:
      locale === "en"
        ? "This link is no longer valid. Please contact us and we will sort it out."
        : "הקישור הזה כבר לא תקף. אפשר לפנות אלינו ונסדר את זה.",
  };
}

/** Resolves a manage link. A meeting that already happened cannot be changed. */
export async function lookupByToken(token: string, locale = "he"): Promise<ManageLookup> {
  const booking = await findByToken(token);
  if (!booking) return notFound(locale);
  if (booking.status !== "cancelled" && Date.parse(booking.slotISO) < Date.now()) {
    return {
      ok: false,
      reason: "past",
      error:
        locale === "en"
          ? "That meeting has already taken place."
          : "הפגישה הזאת כבר התקיימה.",
    };
  }
  return { ok: true, booking };
}

export async function cancelBooking(token: string, locale = "he"): Promise<BookingResult> {
  const found = await lookupByToken(token, locale);
  if (!found.ok) return { ok: false, reason: found.reason, error: found.error };
  const booking = found.booking;
  // Cancelling twice is not an error — the visitor clicked the link again.
  if (booking.status === "cancelled") return { ok: true, booking };

  const cancelled: Booking = {
    ...booking,
    status: "cancelled",
    cancelledAt: new Date().toISOString(),
  };
  if (!(await updateBooking(cancelled))) return notFoundResult(locale);

  // The slot is free the moment the store says so; the calendar and the emails
  // are catching up, and neither failing should undo the cancellation.
  if (cancelled.googleEventId) await deleteEvent(cancelled.googleEventId);
  if (!(await sendCancelled(cancelled))) {
    console.error("[booking] cancellation emails failed", { id: cancelled.id, to: cancelled.email });
  }
  return { ok: true, booking: cancelled };
}

function notFoundResult(locale: string): BookingResult {
  return {
    ok: false,
    reason: "unknown",
    error:
      locale === "en"
        ? "This link is no longer valid. Please contact us and we will sort it out."
        : "הקישור הזה כבר לא תקף. אפשר לפנות אלינו ונסדר את זה.",
  };
}

export async function rescheduleBooking(
  token: string,
  newSlotISO: string,
  locale = "he"
): Promise<BookingResult> {
  const found = await lookupByToken(token, locale);
  if (!found.ok) return { ok: false, reason: found.reason, error: found.error };
  const booking = found.booking;
  if (booking.status === "cancelled") return notFoundResult(locale);

  const slot = new Date(newSlotISO);
  if (!Number.isFinite(slot.getTime())) return invalid(locale);
  if (slot.toISOString() === booking.slotISO) {
    // Used to return ok and do nothing: no move, no email, and a page that said
    // "updated". Saying so is the only honest answer — nothing happened.
    return {
      ok: false,
      reason: "same-slot",
      error:
        locale === "en"
          ? "That is the meeting's current time. Pick a different one to move it."
          : "זה המועד הנוכחי של הפגישה. כדי להזיז אותה, צריך לבחור מועד אחר.",
    };
  }

  // Only the new slot needs protecting: releasing the old one cannot collide
  // with anything, so one lock — on the day being taken — is enough.
  return withLock(dayKey(slot), async () => {
    // Re-read: the booking may have been cancelled while we waited for the lock.
    const current = await findByToken(token);
    if (!current || current.status === "cancelled") return notFoundResult(locale);

    // Excluding itself: the meeting must not collide with where it currently is.
    const check = await checkSlot(slot.toISOString(), new Date(), locale, current.id);
    if (!check.ok) return { ok: false, reason: check.reason, error: check.message };

    const moved: Booking = {
      ...current,
      slotISO: slot.toISOString(),
      slotLabel: formatSlot(slot, current.locale || locale),
      movedFrom: current.slotLabel,
      // A moved meeting has not been reminded about at its new time.
      reminderSent: false,
    };
    if (!(await updateBooking(moved))) return notFoundResult(locale);

    if (moved.googleEventId) {
      // A PATCH keeps the conference, so the Meet link in the original
      // confirmation still works. If it fails the meeting is still moved —
      // the emails carry the truth, and the owner's copy says so.
      const ok = await moveEvent(moved.googleEventId, slot);
      if (!ok) console.error("[booking] calendar event not moved", { id: moved.id });
    }

    if (!(await sendRescheduled(moved))) {
      console.error("[booking] reschedule emails failed", { id: moved.id, to: moved.email });
    }
    ensureReminderLoop();
    return { ok: true, booking: moved };
  });
}
