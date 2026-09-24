import { NextResponse } from "next/server";
import { agentSchema } from "@/lib/validation";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { runAgent, agentConfigured } from "@/lib/llm";
import { recordTurn } from "@/lib/agent-transcripts";

export async function POST(req: Request) {
  const ip = clientIp(req);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "בקשה לא תקינה" }, { status: 400 });
  }

  const parsed = agentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "נתונים לא תקינים" }, { status: 400 });
  }
  const data = parsed.data;

  // Rate-limit per IP and per session.
  if (!rateLimit(`agent:${ip}`, 30, 60_000) || !rateLimit(`agent:s:${data.sessionId}`, 20, 60_000)) {
    return NextResponse.json({ ok: false, error: "יותר מדי הודעות. נסו שוב בעוד רגע." }, { status: 429 });
  }

  // Graceful degradation — no LLM key configured.
  if (!agentConfigured()) {
    return NextResponse.json({
      ok: true,
      reply: null,
      offline: true,
    });
  }

  try {
    const reply = await runAgent(data.messages, data.locale);
    // Hold the conversation in memory; it is emailed as one transcript once the
    // person stops typing, rather than a message at a time.
    recordTurn(data.sessionId, data.locale, data.messages, reply);
    return NextResponse.json({ ok: true, reply });
  } catch (err) {
    console.error("[agent] failed", err);
    return NextResponse.json(
      { ok: false, error: "הסוכן לא זמין כרגע. אפשר לפנות אלינו בוואטסאפ." },
      { status: 502 }
    );
  }
}
