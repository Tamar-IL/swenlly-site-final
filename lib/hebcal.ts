// Shabbat and holiday detection for the booking calendar.
//
// Saturdays are arithmetic, so they never depend on the network. Yom-tov dates
// are not, so they come from Hebcal's public JSON API (Israel scheme) and are
// cached in memory. If Hebcal is unreachable we still block every Friday and
// Saturday — better to offer fewer slots than to book a meeting on a chag.

import { addDays, dayKey, parseDayKey, wallOf } from "./time";

const ENDPOINT = "https://www.hebcal.com/hebcal";
const TTL_MS = 12 * 60 * 60 * 1000;
// A failed lookup is cached briefly too, so an outage at Hebcal does not turn
// every availability request into another outbound call.
const DEGRADED_TTL_MS = 5 * 60 * 1000;

export type BlockedDay = {
  /** "YYYY-MM-DD" in Israel time. */
  day: string;
  /** "shabbat" | "yomtov" | "erev" */
  reason: "shabbat" | "yomtov" | "erev";
  /** Holiday name, when we have one. */
  label?: string;
};

type CacheEntry = { at: number; key: string; days: Map<string, BlockedDay>; degraded: boolean };

let cache: CacheEntry | null = null;
let inflight: Promise<CacheEntry> | null = null;

type HebcalItem = { title?: string; hebrew?: string; date?: string; yomtov?: boolean; category?: string };

async function fetchYomTov(start: string, end: string): Promise<{ map: Map<string, string>; ok: boolean }> {
  const url =
    `${ENDPOINT}?v=1&cfg=json&maj=on&min=off&mod=off&nx=off&ss=off&mf=off&s=off&c=off&i=on` +
    `&start=${start}&end=${end}`;
  const map = new Map<string, string>();
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(6000),
      // Next caches fetches aggressively by default; we do our own caching.
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("[hebcal] request failed", res.status);
      return { map, ok: false };
    }
    const data = (await res.json()) as { items?: HebcalItem[] };
    for (const item of data.items || []) {
      if (!item.yomtov || !item.date) continue;
      // Holiday items are plain "YYYY-MM-DD"; anything with a time is not a rest day.
      const day = item.date.slice(0, 10);
      map.set(day, item.hebrew || item.title || "חג");
    }
    return { map, ok: true };
  } catch (err) {
    console.error("[hebcal] request error", err);
    return { map, ok: false };
  }
}

/**
 * Every day in [from, from+days] that may not hold a meeting: Shabbat, yom tov,
 * and the day before each of them.
 */
async function loadBlocked(from: Date, days: number): Promise<CacheEntry> {
  // Ask for one extra day at each end so "the day before" is correct at the edges.
  const start = dayKey(addDays(from, -1));
  const end = dayKey(addDays(from, days + 1));
  const { map, ok } = await fetchYomTov(start, end);

  const blocked = new Map<string, BlockedDay>();
  const mark = (key: string, entry: BlockedDay) => {
    // A real rest day outranks an "erev" label for the same date.
    const existing = blocked.get(key);
    if (existing && existing.reason !== "erev") return;
    blocked.set(key, entry);
  };

  for (let i = -1; i <= days + 1; i++) {
    const date = addDays(from, i);
    const key = dayKey(date);
    if (wallOf(date).weekday === 6) mark(key, { day: key, reason: "shabbat", label: "שבת" });
    const holiday = map.get(key);
    if (holiday) mark(key, { day: key, reason: "yomtov", label: holiday });
  }

  // Second pass: the eve of anything blocked above is blocked too.
  for (const entry of [...blocked.values()]) {
    if (entry.reason === "erev") continue;
    const date = parseDayKey(entry.day);
    if (!date) continue;
    const eve = dayKey(addDays(date, -1));
    mark(eve, { day: eve, reason: "erev", label: entry.label });
  }

  return { at: Date.now(), key: `${dayKey(from)}:${days}`, days: blocked, degraded: !ok };
}

/** Cached view of the blocked days covering the booking horizon. */
export async function blockedDays(from: Date, horizonDays: number): Promise<CacheEntry> {
  const key = `${dayKey(from)}:${horizonDays}`;
  const ttl = cache?.degraded ? DEGRADED_TTL_MS : TTL_MS;
  if (cache && cache.key === key && Date.now() - cache.at < ttl) return cache;
  if (inflight) return inflight;
  inflight = loadBlocked(from, horizonDays)
    .then((entry) => {
      cache = entry;
      return entry;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Why a given Israel calendar day cannot hold a meeting, or null if it can. */
export async function dayBlock(date: Date, from: Date, horizonDays: number): Promise<BlockedDay | null> {
  const { days } = await blockedDays(from, horizonDays);
  return days.get(dayKey(date)) || null;
}
