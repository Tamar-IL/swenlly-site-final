import { NextResponse } from "next/server";
import { bookingSchema } from "@/lib/validation";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { createRecord } from "@/lib/airtable";
import { notifyBooking } from "@/lib/resend";

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

  const result = await createRecord("Bookings", {
    name: data.name,
    phone: data.phone,
    email: data.email,
    slot: data.slot,
    topic: data.topic || "",
    locale: data.locale,
    status: "Pending",
    createdAt: new Date().toISOString(),
  });
  const mailed = await notifyBooking({
    name: data.name,
    phone: data.phone,
    email: data.email,
    slot: data.slot,
    topic: data.topic || undefined,
  });

  if (!result.ok && !mailed) {
    console.error("[booking] LOST — Airtable and email both failed", {
      airtable: result.ok,
      email: mailed,
      name: data.name,
      phone: data.phone,
    });
    return NextResponse.json(
      { ok: false, error: "לא הצלחנו לקלוט את הבקשה. אפשר לכתוב לנו בוואטסאפ ונתאם מועד." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, bookingId: result.id });
}
