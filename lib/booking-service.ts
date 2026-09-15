// One path to a booked meeting, used by both the public form and the AI agent.
// Whatever books a meeting goes through here, so the rules, the emails and the
// reminder can never drift apart between the two.

import { checkSlot } from "./availability";
import { formatSlot } from "./time";
import { saveBooking, Booking } from "./bookings-store";
import { sendBookingConfirmation, sendBookingBrief } from "./resend";
import { businessBrief, researchLinks } from "./llm/research";
import { ensureReminderLoop } from "./reminders";

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

export async function createBooking(req: BookingRequest): Promise<BookingResult> {
  const now = new Date();
  const check = await checkSlot(req.slot, now, req.locale);
  if (!check.ok) return { ok: false, reason: check.reason, error: check.message };

  const slot = new Date(req.slot);
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

  const saved = await saveBooking(booking);
  const confirmed = await sendBookingConfirmation(booking);

  if (!saved.ok && !confirmed) {
    console.error("[booking] LOST — nothing stored and no email sent", { slot: booking.slotISO });
    return {
      ok: false,
      reason: "delivery",
      error:
        req.locale === "en"
          ? "We could not record the meeting. Please message us on WhatsApp and we will set it up."
          : "לא הצלחנו לקלוט את הפגישה. אפשר לכתוב לנו בוואטסאפ ונתאם.",
    };
  }

  sendOwnerBrief({ ...booking, id: saved.id });
  ensureReminderLoop();
  return { ok: true, booking: { ...booking, id: saved.id } };
}
