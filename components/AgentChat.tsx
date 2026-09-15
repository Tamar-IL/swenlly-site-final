"use client";

import { useEffect, useRef, useState } from "react";
import { useContent } from "./ContentProvider";

type Msg = { role: "user" | "assistant"; content: string; at: number };

function newSessionId() {
  return "s_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function clock(at: number): string {
  if (!at) return "";
  return new Intl.DateTimeFormat("he-IL", { hour: "2-digit", minute: "2-digit", hour12: false }).format(at);
}

export function AgentChat() {
  const { content, locale } = useContent();
  const a = content.agent;
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: a.starter, at: 0 }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const sessionId = useRef<string>(newSessionId());
  const scroller = useRef<HTMLDivElement>(null);

  // Timestamps are the visitor's own clock, so they can only be filled in after
  // hydration — stamping them during render would not match the server's HTML.
  useEffect(() => {
    setMessages((m) => (m[0]?.at ? m : [{ ...m[0], at: Date.now() }, ...m.slice(1)]));
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const lastUserIndex = messages.reduce((found, m, i) => (m.role === "user" ? i : found), -1);

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: clean, at: Date.now() }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionId.current,
          messages: next.map(({ role, content }) => ({ role, content })),
          locale,
        }),
      });
      const data = await res.json();
      const reply = data.offline ? a.offline : data.reply || data.error || a.offline;
      setMessages((m) => [...m, { role: "assistant", content: reply, at: Date.now() }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: a.offline, at: Date.now() }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card chatcard">
      <div>
        <div className="ttl">{a.chatTitle}</div>
        <div className="sub">{a.chatSub}</div>
      </div>

      <div ref={scroller} className="chatwin">
        {messages.map((m, i) => {
          const mine = m.role === "user";
          const avatar = mine ? (
            <span className="avatar me" aria-hidden="true" />
          ) : (
            <img className="avatar" src="/brand/swenlly-chat-icon.webp" alt="" loading="lazy" decoding="async" />
          );
          return (
            <div key={i} className={`bubblerow ${mine ? "me" : "bot"}`}>
              {!mine && avatar}
              <div className="bubblecol">
                <div className="bubblemeta">
                  <span className="who">{mine ? a.youName : a.botName}</span>
                  <span className="when">{clock(m.at)}</span>
                </div>
                <div className="bubble">{m.content}</div>
                {mine && i === lastUserIndex && <div className="bubblestatus">{a.sent}</div>}
              </div>
              {mine && avatar}
            </div>
          );
        })}

        {busy && (
          <div className="bubblerow bot">
            <img className="avatar" src="/brand/swenlly-chat-icon.webp" alt="" loading="lazy" decoding="async" />
            <div className="bubblecol">
              <div className="bubble typing" aria-label={a.typing}>
                <i /><i /><i />
              </div>
            </div>
          </div>
        )}
      </div>

      <form
        className="chatbar"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={a.placeholder}
          aria-label={a.placeholder}
          disabled={busy}
        />
        <button className="pill pill-w" type="submit" disabled={busy || !input.trim()}>
          {a.send}
        </button>
      </form>

      <div className="chatsuggest">
        {a.suggestions.map((s) => (
          <button key={s} type="button" className="newp" onClick={() => send(s)} disabled={busy}>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
