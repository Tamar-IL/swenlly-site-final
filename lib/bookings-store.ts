// Where booked meetings live.
//
// Airtable is the durable store when it is configured. It is optional, though,
// and a site running on email alone still must not double-book a slot or forget
// to send a reminder — so every booking is also kept in memory for as long as
// the container lives. Reads merge both.

import { createRecord, listRecords, updateRecord, deleteRecord, airtableConfigured } from "./airtable";

export type Booking = {
  id?: string;
  /** The meeting instant, as a UTC ISO string. This is the identity of a slot. */
  slotISO: string;
  /** The same instant written out in Israel time, for humans. */
  slotLabel: string;
  name: string;
  phone: string;
  email: string;
  business: string;
  field?: string;
  topic: string;
  locale: string;
  source: "site" | "agent";
  createdAt: string;
  reminderSent?: boolean;
  /** Google Meet URL, when a calendar event was created for this meeting. */
  meetLink?: string;
  /** The Google Calendar event id, so a losing booking can clean up after itself. */
  googleEventId?: string;
};

const TABLE = "Bookings";

/** slotISO → booking. Also the fallback store when Airtable is unset. */
const memory = new Map<string, Booking>();

function prune(now = Date.now()) {
  for (const [key, b] of memory) {
    // Keep a couple of hours past the meeting so reminders/lookups still work.
    if (Date.parse(b.slotISO) < now - 2 * 60 * 60 * 1000) memory.delete(key);
  }
}

function toFields(b: Booking): Record<string, unknown> {
  return {
    name: b.name,
    phone: b.phone,
    email: b.email,
    business: b.business,
    businessField: b.field || "",
    topic: b.topic,
    slot: b.slotLabel,
    slotISO: b.slotISO,
    locale: b.locale,
    source: b.source,
    status: "Confirmed",
    reminderSent: false,
    meetLink: b.meetLink || "",
    googleEventId: b.googleEventId || "",
    createdAt: b.createdAt,
  };
}

function fromFields(id: string, f: Record<string, unknown>): Booking | null {
  const slotISO = typeof f.slotISO === "string" ? f.slotISO : "";
  if (!slotISO) return null;
  return {
    id,
    slotISO,
    slotLabel: String(f.slot || ""),
    name: String(f.name || ""),
    phone: String(f.phone || ""),
    email: String(f.email || ""),
    business: String(f.business || ""),
    field: String(f.businessField || ""),
    topic: String(f.topic || ""),
    locale: String(f.locale || "he"),
    source: (String(f.source || "site") === "agent" ? "agent" : "site"),
    createdAt: String(f.createdAt || ""),
    reminderSent: f.reminderSent === true,
    meetLink: String(f.meetLink || ""),
    googleEventId: String(f.googleEventId || ""),
  };
}

export async function saveBooking(b: Booking): Promise<{ ok: boolean; id?: string }> {
  prune();
  const result = await createRecord(TABLE, toFields(b));
  const stored: Booking = { ...b, id: result.id };
  memory.set(b.slotISO, stored);
  // Without Airtable the in-memory copy IS the record, so this still counts as
  // stored; the caller only treats email failure as a lost booking.
  return { ok: result.ok || !airtableConfigured(), id: result.id };
}

/**
 * Start times of every meeting already booked in [from, to], as epoch ms.
 * Starts rather than a set of exact slots, because a neighbouring meeting
 * blocks a slot through its break without sharing its start.
 */
export async function takenSlots(from: Date, to: Date): Promise<number[]> {
  prune();
  const taken = new Set<number>();
  for (const b of memory.values()) {
    const t = Date.parse(b.slotISO);
    if (t >= from.getTime() && t <= to.getTime()) taken.add(t);
  }
  const res = await listRecords(TABLE, {
    filterByFormula: `AND({slotISO} >= '${from.toISOString()}', {slotISO} <= '${to.toISOString()}')`,
    maxRecords: 500,
    fields: ["slotISO"],
  });
  for (const r of res.records) {
    const iso = r.fields.slotISO;
    const t = typeof iso === "string" ? Date.parse(iso) : NaN;
    if (Number.isFinite(t)) taken.add(t);
  }
  return [...taken];
}

/**
 * Bookings in [from, to] as full records, newest write last. Used to settle a
 * race: whoever has the earliest createdAt keeps the slot.
 */
export async function bookingsInRange(from: Date, to: Date): Promise<Booking[]> {
  prune();
  // Keyed by record id, not by slot: two records CAN share a slot — that is
  // exactly the collision the caller is looking for, and keying by slot would
  // hide it by collapsing them into one.
  const found = new Map<string, Booking>();
  const key = (b: Booking) => b.id || `mem:${b.slotISO}`;
  for (const b of memory.values()) {
    const t = Date.parse(b.slotISO);
    if (t >= from.getTime() && t <= to.getTime()) found.set(key(b), b);
  }
  const res = await listRecords(TABLE, {
    filterByFormula: `AND({slotISO} >= '${from.toISOString()}', {slotISO} <= '${to.toISOString()}')`,
    maxRecords: 100,
  });
  for (const r of res.records) {
    const b = fromFields(r.id, r.fields);
    if (b) found.set(key(b), b);
  }
  return [...found.values()];
}

/** Removes a booking that lost a race. Best effort — it must never throw. */
export async function dropBooking(b: Booking): Promise<void> {
  memory.delete(b.slotISO);
  if (b.id) await deleteRecord(TABLE, b.id);
}

/** Bookings starting inside [from, to] that have not had their reminder sent. */
export async function dueReminders(from: Date, to: Date): Promise<Booking[]> {
  prune();
  const due = new Map<string, Booking>();
  for (const b of memory.values()) {
    const t = Date.parse(b.slotISO);
    if (!b.reminderSent && t >= from.getTime() && t <= to.getTime()) due.set(b.slotISO, b);
  }
  const res = await listRecords(TABLE, {
    filterByFormula:
      `AND({slotISO} >= '${from.toISOString()}', {slotISO} <= '${to.toISOString()}', ` +
      `NOT({reminderSent}))`,
    maxRecords: 100,
  });
  for (const r of res.records) {
    const b = fromFields(r.id, r.fields);
    if (b) due.set(b.slotISO, b);
  }
  return [...due.values()];
}

export async function markReminderSent(b: Booking): Promise<void> {
  const cached = memory.get(b.slotISO);
  if (cached) cached.reminderSent = true;
  if (b.id) await updateRecord(TABLE, b.id, { reminderSent: true });
}
