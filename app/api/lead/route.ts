import { NextResponse } from "next/server";
import { leadSchema } from "@/lib/validation";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { createRecord } from "@/lib/airtable";
import { notifyLead } from "@/lib/resend";

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`lead:${ip}`, 8, 60_000)) {
    return NextResponse.json({ ok: false, error: "יותר מדי בקשות. נסו שוב בעוד רגע." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "בקשה לא תקינה" }, { status: 400 });
  }

  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message || "נתונים לא תקינים" },
      { status: 400 }
    );
  }
  const data = parsed.data;

  // Honeypot — silently succeed for bots.
  if (data.hp) return NextResponse.json({ ok: true });

  if (!(await verifyTurnstile(data.turnstileToken, ip))) {
    return NextResponse.json({ ok: false, error: "אימות נכשל. נסו שוב." }, { status: 400 });
  }

  await createRecord("Leads", {
    name: data.name,
    phone: data.phone,
    email: data.email || "",
    message: data.message || "",
    source: data.source,
    locale: data.locale,
    status: "New",
    createdAt: new Date().toISOString(),
  });
  await notifyLead({
    name: data.name,
    phone: data.phone,
    email: data.email || undefined,
    message: data.message || undefined,
    source: data.source,
  });

  return NextResponse.json({ ok: true });
}
