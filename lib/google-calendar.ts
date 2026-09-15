// Google Calendar, for the one thing we need from it: a Meet link per meeting.
//
// Authentication is an OAuth refresh token for the account whose calendar the
// meetings belong to. That is deliberate — a service account can only mint Meet
// links by impersonating a real user through domain-wide delegation, which needs
// Google Workspace and an admin. A refresh token works on a plain Gmail account
// too, and `npm run google:token` walks through minting one.
//
// Everything here degrades: with no credentials, or with Google down, the
// booking still goes through and the emails simply carry no link.

import { SLOT_MINUTES } from "./availability";
import { TZ } from "./time";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API = "https://www.googleapis.com/calendar/v3";

export type MeetEvent = { meetLink: string; eventId: string };

function config() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return null;
  return {
    clientId,
    clientSecret,
    refreshToken,
    calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
  };
}

export function googleCalendarConfigured(): boolean {
  return config() !== null;
}

// Access tokens last an hour; minting one per booking would be a wasted round
// trip. Cached in the process with a minute of slack before expiry.
let cached: { token: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string | null> {
  const cfg = config();
  if (!cfg) return null;
  if (cached && Date.now() < cached.expiresAt) return cached.token;
  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        refresh_token: cfg.refreshToken,
        grant_type: "refresh_token",
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      // A revoked or expired refresh token lands here. Loud, because the fix is
      // to mint a new one — nothing retries its way out of this.
      console.error("[google] token refresh failed", res.status, await res.text());
      return null;
    }
    const data = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!data.access_token) return null;
    cached = {
      token: data.access_token,
      expiresAt: Date.now() + Math.max(60, (data.expires_in ?? 3600) - 60) * 1000,
    };
    return cached.token;
  } catch (err) {
    console.error("[google] token refresh error", err);
    return null;
  }
}

/**
 * Creates the calendar event with a Meet conference attached.
 * Returns null — never throws — when Google is unconfigured or unreachable.
 */
export async function createMeetEvent(input: {
  start: Date;
  business: string;
  name: string;
  email: string;
  phone: string;
  topic: string;
  field?: string;
}): Promise<MeetEvent | null> {
  const cfg = config();
  if (!cfg) return null;
  const token = await accessToken();
  if (!token) return null;

  const end = new Date(input.start.getTime() + SLOT_MINUTES * 60_000);
  const description = [
    `עסק: ${input.business}`,
    input.field ? `תחום: ${input.field}` : "",
    `נושא: ${input.topic}`,
    `איש קשר: ${input.name} · ${input.phone} · ${input.email}`,
    "",
    "נקבע דרך swenlly.com",
  ]
    .filter(Boolean)
    .join("\n");

  const body = {
    summary: `שיחת ייעוץ · סוונלי ו${input.business || input.name}`,
    description,
    start: { dateTime: input.start.toISOString(), timeZone: TZ },
    end: { dateTime: end.toISOString(), timeZone: TZ },
    attendees: input.email ? [{ email: input.email, displayName: input.name }] : [],
    conferenceData: {
      createRequest: {
        // Google dedupes on this, so a retry of the same booking reuses the
        // same conference instead of creating a second one.
        requestId: `swenlly-${input.start.getTime()}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
    reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 60 }] },
  };

  try {
    // sendUpdates=none: swenlly sends its own confirmation and reminder, and two
    // invitations for one meeting is worse than none.
    const res = await fetch(
      `${API}/calendars/${encodeURIComponent(cfg.calendarId)}/events` +
        `?conferenceDataVersion=1&sendUpdates=none`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      }
    );
    if (!res.ok) {
      console.error("[google] event create failed", res.status, await res.text());
      return null;
    }
    const data = (await res.json()) as {
      id?: string;
      hangoutLink?: string;
      conferenceData?: { entryPoints?: { entryPointType?: string; uri?: string }[] };
    };
    const link =
      data.hangoutLink ||
      data.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri ||
      "";
    if (!data.id || !link) {
      console.error("[google] event created without a Meet link", { id: data.id });
      return data.id ? { eventId: data.id, meetLink: "" } : null;
    }
    return { eventId: data.id, meetLink: link };
  } catch (err) {
    console.error("[google] event create error", err);
    return null;
  }
}

/** Removes an event — used when a booking loses a race after it was created. */
export async function deleteEvent(eventId: string): Promise<void> {
  const cfg = config();
  if (!cfg || !eventId) return;
  const token = await accessToken();
  if (!token) return;
  try {
    const res = await fetch(
      `${API}/calendars/${encodeURIComponent(cfg.calendarId)}/events/${encodeURIComponent(eventId)}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
    );
    // 410 means it is already gone, which is the outcome we wanted anyway.
    if (!res.ok && res.status !== 410) {
      console.error("[google] event delete failed", res.status, await res.text());
    }
  } catch (err) {
    console.error("[google] event delete error", err);
  }
}
