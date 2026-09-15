// Where booked meetings live.
//
// A JSON file on a mounted volume, held in memory and written whole on every
// change. There are a handful of bookings a day, so the whole set fits in memory
// and every read — the availability calendar asks on every page load — is free.
//
// A file, not a database: the site is one container, the data is tiny, and a
// meeting that survives a restart is the entire requirement. The file is the
// record. Losing it reopens booked slots and drops pending reminders, so it
// belongs on a volume (see docker-compose.yml) and in whatever backs that up.

import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";

export type BookingStatus = "confirmed" | "cancelled";

export type Booking = {
  /** Our own id. Also the file's key. */
  id: string;
  /** Unguessable key for the cancel/reschedule links in the emails. */
  token: string;
  status: BookingStatus;
  /** The meeting instant, as a UTC ISO string. */
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
  /** The Google Calendar event id, so the event can be moved or removed with it. */
  googleEventId?: string;
  /** Set when the meeting was moved, for the "was X, now Y" line in the emails. */
  movedFrom?: string;
  cancelledAt?: string;
};

type FileShape = { version: 1; bookings: Booking[] };

function storePath(): string {
  if (process.env.BOOKINGS_FILE) return process.env.BOOKINGS_FILE;
  return path.join(process.env.DATA_DIR || path.join(process.cwd(), "data"), "bookings.json");
}

// Cached in the process and refreshed when the file changes underneath us, so a
// second process editing the same volume is noticed rather than overwritten
// wholesale. One container is still the supported shape.
let cache: Map<string, Booking> | null = null;
let loadedMtimeMs = -1;
let loading: Promise<Map<string, Booking>> | null = null;

async function readFromDisk(): Promise<Map<string, Booking>> {
  const file = storePath();
  try {
    const raw = await readFile(file, "utf8");
    const data = JSON.parse(raw) as FileShape;
    const map = new Map<string, Booking>();
    for (const b of data.bookings || []) if (b?.id) map.set(b.id, b);
    loadedMtimeMs = (await stat(file)).mtimeMs;
    return map;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      // First run. An empty store is the correct answer, not an error.
      loadedMtimeMs = -1;
      return new Map();
    }
    // A corrupt file must not silently become "no bookings booked" — that would
    // reopen every slot. Refuse loudly instead and let the caller fail.
    console.error("[bookings] could not read the store", err);
    throw err;
  }
}

async function load(): Promise<Map<string, Booking>> {
  if (cache) {
    try {
      const m = (await stat(storePath())).mtimeMs;
      if (m === loadedMtimeMs) return cache;
    } catch {
      // Gone from under us; fall through and re-read.
    }
  }
  if (loading) return loading;
  loading = readFromDisk()
    .then((map) => {
      cache = map;
      return map;
    })
    .finally(() => {
      loading = null;
    });
  return loading;
}

/** The privacy policy promises meetings are not kept beyond this. */
const RETENTION_DAYS = Number(process.env.BOOKING_RETENTION_DAYS || 365 * 3);

function prune(map: Map<string, Booking>): void {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  for (const [id, b] of map) {
    const t = Date.parse(b.slotISO);
    if (Number.isFinite(t) && t < cutoff) map.delete(id);
  }
}

async function persist(map: Map<string, Booking>): Promise<void> {
  prune(map);
  const file = storePath();
  await mkdir(path.dirname(file), { recursive: true });
  const payload: FileShape = { version: 1, bookings: [...map.values()] };
  // Write beside the target and rename: a crash mid-write leaves the previous
  // file intact rather than a half-written one.
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(payload, null, 2), "utf8");
  await rename(tmp, file);
  cache = map;
  loadedMtimeMs = (await stat(file)).mtimeMs;
}

/** Meetings that still occupy their slot. Cancelled ones free it again. */
function isLive(b: Booking): boolean {
  return b.status !== "cancelled";
}

export function newId(): string {
  return randomBytes(9).toString("hex");
}

export function newToken(): string {
  return randomBytes(24).toString("hex");
}

export async function saveBooking(b: Booking): Promise<{ ok: boolean; id?: string }> {
  try {
    const map = await load();
    map.set(b.id, b);
    await persist(map);
    return { ok: true, id: b.id };
  } catch (err) {
    console.error("[bookings] save failed", err);
    return { ok: false };
  }
}

/** Replaces a booking that already exists. Returns false if it is gone. */
export async function updateBooking(b: Booking): Promise<boolean> {
  try {
    const map = await load();
    if (!map.has(b.id)) return false;
    map.set(b.id, b);
    await persist(map);
    return true;
  } catch (err) {
    console.error("[bookings] update failed", err);
    return false;
  }
}

/**
 * Start times of every live meeting in [from, to], as epoch ms. Starts rather
 * than exact slots, because a neighbouring meeting blocks a slot through its
 * break without sharing its start.
 */
export async function takenSlots(from: Date, to: Date, excludeId?: string): Promise<number[]> {
  const map = await load();
  const out: number[] = [];
  for (const b of map.values()) {
    if (!isLive(b) || b.id === excludeId) continue;
    const t = Date.parse(b.slotISO);
    if (t >= from.getTime() && t <= to.getTime()) out.push(t);
  }
  return out;
}

/** How many live meetings fall on each Israel calendar day in the range. */
export async function countsByDay(
  from: Date,
  to: Date,
  dayOf: (d: Date) => string,
  excludeId?: string
): Promise<Map<string, number>> {
  const map = await load();
  const counts = new Map<string, number>();
  for (const b of map.values()) {
    if (!isLive(b) || b.id === excludeId) continue;
    const t = Date.parse(b.slotISO);
    if (t < from.getTime() || t > to.getTime()) continue;
    const key = dayOf(new Date(t));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

export async function findByToken(token: string): Promise<Booking | null> {
  if (!token) return null;
  const map = await load();
  for (const b of map.values()) if (b.token === token) return b;
  return null;
}

export async function findById(id: string): Promise<Booking | null> {
  const map = await load();
  return map.get(id) ?? null;
}

/** Live bookings in [from, to] that have not had their reminder sent. */
export async function dueReminders(from: Date, to: Date): Promise<Booking[]> {
  const map = await load();
  return [...map.values()].filter((b) => {
    if (!isLive(b) || b.reminderSent) return false;
    const t = Date.parse(b.slotISO);
    return t >= from.getTime() && t <= to.getTime();
  });
}

export async function markReminderSent(b: Booking): Promise<void> {
  await updateBooking({ ...b, reminderSent: true });
}
