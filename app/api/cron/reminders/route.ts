import { NextResponse } from "next/server";
import { sweepReminders, ensureReminderLoop } from "@/lib/reminders";

export const dynamic = "force-dynamic";

/**
 * Sends the hour-before reminders that are due right now.
 *
 * The server already sweeps on its own every few minutes; this endpoint exists
 * for deployments where that is not enough — a platform that idles the process,
 * or an external cron someone would rather trust. Safe to call as often as you
 * like: a booking is only ever reminded once.
 *
 * Protect it by setting CRON_SECRET and calling with
 *   Authorization: Bearer $CRON_SECRET
 */
async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header = req.headers.get("authorization") || "";
    if (header !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }
  ensureReminderLoop();
  const result = await sweepReminders();
  return NextResponse.json({ ok: true, ...result });
}

export const GET = handle;
export const POST = handle;
