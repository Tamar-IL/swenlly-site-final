import { NextResponse } from "next/server";

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
  const provider = (process.env.LLM_PROVIDER || "anthropic").toLowerCase().trim();
  const usingOpenAI = ["openai", "gpt", "chatgpt"].includes(provider);

  return NextResponse.json({
    ok: true,
    comingSoon: process.env.COMING_SOON === "true",
    integrations: {
      airtable: !!process.env.AIRTABLE_API_KEY && !!process.env.AIRTABLE_BASE_ID,
      resend: !!process.env.RESEND_API_KEY,
      // false means NOTIFY_EMAIL was not read and the built-in default is in use —
      // the usual cause is a hyphen or a space in the variable name.
      notifyEmailFromEnv: !!process.env.NOTIFY_EMAIL,
      turnstile: !!process.env.TURNSTILE_SECRET,
    },
    agent: {
      provider: usingOpenAI ? "openai" : "anthropic",
      keyPresent: usingOpenAI
        ? !!process.env.OPENAI_API_KEY
        : !!process.env.ANTHROPIC_API_KEY,
    },
  });
}
