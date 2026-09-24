// What people actually said to the agent on the site.
//
// The chat used to write its transcripts to Airtable, which is not configured
// and never will be, behind a `.catch(() => {})` — so every conversation was
// dropped without a trace. They go to the inbox instead: one email per
// conversation, sent once the person stops typing.
//
// Sent, not stored. A transcript is only useful if someone reads it, and an
// inbox is the one place that is already checked. Nothing is kept on disk here,
// which also keeps the privacy promise easy to state honestly.

import type { ChatMessage } from "./llm";
import { sendAgentTranscript } from "./resend";

/** Quiet for this long and the conversation is treated as over. Long enough to
 *  cover someone reading a long answer before replying. */
const IDLE_MS = 10 * 60 * 1000;
/** A conversation this long is sent even if the person is still going, so a
 *  single very long session does not sit in memory all day. */
const MAX_AGE_MS = 60 * 60 * 1000;
/** A ceiling on live conversations, so a flood of sessions cannot grow the heap
 *  without bound. The oldest are sent early rather than dropped. */
const MAX_LIVE = 300;

export type LiveTranscript = {
  sessionId: string;
  locale: string;
  /** The whole conversation. The browser posts its full history on every turn,
   *  so this is replaced wholesale rather than appended to — that also repairs
   *  itself if a turn was lost to a rate limit or a restart. */
  turns: ChatMessage[];
  startedAt: number;
  lastAt: number;
};

// On globalThis: Next reloads modules in dev, and a fresh module-level Map on
// every edit would strand whatever was mid-conversation.
const KEY = Symbol.for("swenlly.agentTranscripts");
const LOOP = Symbol.for("swenlly.agentTranscriptLoop");
type Holder = { [KEY]?: Map<string, LiveTranscript>; [LOOP]?: NodeJS.Timeout };

function live(): Map<string, LiveTranscript> {
  const holder = globalThis as unknown as Holder;
  if (!holder[KEY]) holder[KEY] = new Map();
  return holder[KEY]!;
}

/**
 * Is this conversation worth an email?
 *
 * Someone who opened the chat, typed "היי" and left is not a conversation; the
 * only thing it would tell you is that the widget works. Anything longer than a
 * greeting, or anything that got a second message out of them, is.
 */
export function worthSending(t: LiveTranscript): boolean {
  const asked = t.turns.filter((m) => m.role === "user" && m.content.trim());
  if (asked.length === 0) return false;
  if (asked.length === 1 && asked[0].content.trim().length < 10) return false;
  return true;
}

/** Record a turn. Called after every agent reply; cheap and never throws. */
export function recordTurn(
  sessionId: string,
  locale: string,
  messages: ChatMessage[],
  reply: string,
  now = Date.now()
): void {
  // The loop is started here rather than only at /api/health, so a conversation
  // is never left waiting on something else to tick.
  ensureTranscriptLoop();
  const map = live();
  const existing = map.get(sessionId);
  map.set(sessionId, {
    sessionId,
    locale,
    turns: [...messages, { role: "assistant", content: reply }],
    startedAt: existing?.startedAt ?? now,
    lastAt: now,
  });

  // Keep insertion order meaningful for the overflow trim below.
  if (map.size > MAX_LIVE) {
    const overflow = map.size - MAX_LIVE;
    for (const t of [...map.values()].slice(0, overflow)) void flush(t);
  }
}

async function flush(t: LiveTranscript): Promise<boolean> {
  live().delete(t.sessionId);
  if (!worthSending(t)) return false;
  const sent = await sendAgentTranscript(t);
  if (!sent) {
    // The transcript is about to be gone for good, so at least put it where
    // `docker compose logs` can still reach it.
    console.error("[transcripts] email failed — transcript follows", {
      sessionId: t.sessionId,
      turns: t.turns,
    });
  }
  return sent;
}

export type TranscriptSweep = { pending: number; sent: number };

/** Send every conversation that has gone quiet. */
export async function sweepTranscripts(now = Date.now()): Promise<TranscriptSweep> {
  const due = [...live().values()].filter(
    (t) => now - t.lastAt >= IDLE_MS || now - t.startedAt >= MAX_AGE_MS
  );
  let sent = 0;
  for (const t of due) {
    try {
      if (await flush(t)) sent++;
    } catch (err) {
      console.error("[transcripts] flush failed", err);
    }
  }
  return { pending: live().size, sent };
}

/** One sweep loop per process, same shape as the reminder loop. */
export function ensureTranscriptLoop(): void {
  const holder = globalThis as unknown as Holder;
  if (holder[LOOP]) return;
  const timer = setInterval(() => {
    sweepTranscripts().catch((err) => console.error("[transcripts] sweep error", err));
  }, 60_000);
  timer.unref?.();
  holder[LOOP] = timer;
}

/** For /api/health — how many conversations are waiting to be sent. */
export function transcriptStatus(): { pending: number; idleMinutes: number } {
  return { pending: live().size, idleMinutes: IDLE_MS / 60_000 };
}
