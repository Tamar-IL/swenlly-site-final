import { NextResponse } from "next/server";
import { bookingSchema } from "@/lib/validation";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { createBooking } from "@/lib/booking-service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`booking:${ip}`, 6, 60_000)) {
    return NextResponse.json({ ok: false, error: "יותר מדי בקשות. נסו שוב בעוד רגע." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "בקשה לא תקינה" }, { status: 400 });
  }

  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message || "נתונים לא תקינים" },
      { status: 400 }
    );
  }
  const data = parsed.data;

  if (data.hp) return NextResponse.json({ ok: true });

  if (!(await verifyTurnstile(data.turnstileToken, ip))) {
    return NextResponse.json({ ok: false, error: "אימות נכשל. נסו שוב." }, { status: 400 });
  }

  const result = await createBooking({
    slot: data.slot,
    name: data.name,
    phone: data.phone,
    email: data.email,
    business: data.business,
    field: data.field || "",
    topic: data.topic,
    locale: data.locale,
    source: "site",
  });

  if (!result.ok) {
    // A slot that was taken or is out of range is the visitor's to fix (409);
    // a storage or mail failure is ours (502).
    const status = result.reason === "delivery" ? 502 : 409;
    return NextResponse.json({ ok: false, error: result.error, reason: result.reason }, { status });
  }

  return NextResponse.json({
    ok: true,
    bookingId: result.booking.id,
    slotLabel: result.booking.slotLabel,
    // Whether a Meet link exists, not the link itself: the link belongs in the
    // confirmation email, not in a response anyone could replay.
    meet: !!result.booking.meetLink,
  });
}
