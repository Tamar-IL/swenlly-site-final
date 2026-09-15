import { NextResponse } from "next/server";
import { ensureReminderLoop } from "@/lib/reminders";

export const dynamic = "force-dynamic";

/**
 * Which integrations the running container actually sees.
 *
 * Reports presence, never values — no key, address or id is returned, so this
 * is safe to curl from anywhere. It exists because every adapter here fails
 * soft: a misspelled variable name (NOTIFY-EMAIL instead of NOTIFY_EMAIL) looks
 * identical to a working setup until a lead goes missing.
 */
export function GET() {
  // Docker's HEALTHCHECK hits this every 30s, which makes it the one place
  // guaranteed to run soon after a restart. Starting the reminder sweep here
  // means meetings booked before the restart still get their hour-before email,
  // even if nobody visits the site in between. It is idempotent.
  ensureReminderLoop();

  const provider = (process.env.LLM_PROVIDER || "anthropic").toLowerCase().trim();
  const usingOpenAI = ["openai", "gpt", "chatgpt"].includes(provider);

  const airtable =
    !!process.env.AIRTABLE_API_KEY && !!process.env.AIRTABLE_BASE_ID;
  const resend = !!process.env.RESEND_API_KEY;
  const google =
    !!process.env.GOOGLE_CLIENT_ID &&
    !!process.env.GOOGLE_CLIENT_SECRET &&
    !!process.env.GOOGLE_REFRESH_TOKEN;

  // The question this endpoint exists to answer: if someone submits the contact
  // form right now, does it reach anyone?
  const destinations = [airtable && "airtable", resend && "email"].filter(Boolean);

  return NextResponse.json({
    ok: true,
    leadsReach: destinations.length ? destinations : "NOBODY — submissions will be rejected",

    comingSoon: process.env.COMING_SOON === "true",
    integrations: {
      airtable,
      resend,
      // false means NOTIFY_EMAIL was not read and the built-in default is in use —
      // the usual cause is a hyphen or a space in the variable name.
      notifyEmailFromEnv: !!process.env.NOTIFY_EMAIL,
      turnstile: !!process.env.TURNSTILE_SECRET,
      // false means bookings are confirmed without a Google Meet link.
      googleMeet: google,
    },
    agent: {
      provider: usingOpenAI ? "openai" : "anthropic",
      keyPresent: usingOpenAI
        ? !!process.env.OPENAI_API_KEY
        : !!process.env.ANTHROPIC_API_KEY,
    },
  });
}
