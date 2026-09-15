import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { lookupByToken, cancelBooking, rescheduleBooking } from "@/lib/booking-service";
import { availableDays } from "@/lib/availability";
import { isLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const tokenSchema = z.string().trim().regex(/^[a-f0-9]{16,64}$/, "קישור לא תקין");

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("cancel"), token: tokenSchema, locale: z.string().max(10).default("he") }),
  z.object({
    action: z.literal("reschedule"),
    token: tokenSchema,
    slot: z.string().trim().datetime({ message: "נא לבחור מועד מהיומן" }),
    locale: z.string().max(10).default("he"),
  }),
]);

/** What the client sees on the manage page. Never the phone or the token back. */
function publicView(booking: {
  slotISO: string;
  slotLabel: string;
  business: string;
  topic: string;
  name: string;
  status: string;
  meetLink?: string;
}) {
  return {
    slotISO: booking.slotISO,
    slotLabel: booking.slotLabel,
    business: booking.business,
    topic: booking.topic,
    name: booking.name,
    status: booking.status,
    meetLink: booking.meetLink || "",
  };
}

export async function GET(req: Request) {
  const ip = clientIp(req);
  // Tight: this endpoint answers "does this token exist", so it must not be a
  // place anyone can sit and guess.
  if (!rateLimit(`manage:${ip}`, 20, 60_000)) {
    return NextResponse.json({ ok: false, error: "יותר מדי בקשות. נסו שוב בעוד רגע." }, { status: 429 });
  }

  const url = new URL(req.url);
  const raw = url.searchParams.get("locale") || "he";
  const locale = isLocale(raw) ? raw : "he";
  const token = tokenSchema.safeParse(url.searchParams.get("t") || "");
  if (!token.success) {
    return NextResponse.json({ ok: false, error: "קישור לא תקין" }, { status: 400 });
  }

  const found = await lookupByToken(token.data, locale);
  if (!found.ok) {
    return NextResponse.json({ ok: false, error: found.error, reason: found.reason }, { status: 404 });
  }

  // The picker excludes this meeting, so its own day is not reported full and
  // its own slot is not reported taken.
  const days = await availableDays(new Date(), locale, found.booking.id);
  return NextResponse.json({ ok: true, booking: publicView(found.booking), days });
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`manage:${ip}`, 20, 60_000)) {
    return NextResponse.json({ ok: false, error: "יותר מדי בקשות. נסו שוב בעוד רגע." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "בקשה לא תקינה" }, { status: 400 });
  }

  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message || "נתונים לא תקינים" },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const result =
    data.action === "cancel"
      ? await cancelBooking(data.token, data.locale)
      : await rescheduleBooking(data.token, data.slot, data.locale);

  if (!result.ok) {
    const status = result.reason === "unknown" || result.reason === "past" ? 404 : 409;
    return NextResponse.json({ ok: false, error: result.error, reason: result.reason }, { status });
  }

  return NextResponse.json({ ok: true, booking: publicView(result.booking) });
}
