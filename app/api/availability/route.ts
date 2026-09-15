import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { availableDays, MIN_LEAD_HOURS, HORIZON_DAYS, SLOT_MINUTES } from "@/lib/availability";
import { isLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

/** The open slots the booking calendar renders. Read-only. */
export async function GET(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`availability:${ip}`, 40, 60_000)) {
    return NextResponse.json({ ok: false, error: "יותר מדי בקשות." }, { status: 429 });
  }

  const raw = new URL(req.url).searchParams.get("locale") || "he";
  const locale = isLocale(raw) ? raw : "he";

  try {
    const days = await availableDays(new Date(), locale);
    return NextResponse.json({
      ok: true,
      days,
      rules: { minLeadHours: MIN_LEAD_HOURS, horizonDays: HORIZON_DAYS, slotMinutes: SLOT_MINUTES },
    });
  } catch (err) {
    console.error("[availability] failed", err);
    return NextResponse.json({ ok: false, error: "לא הצלחנו לטעון את היומן." }, { status: 502 });
  }
}
