"use client";

import { useEffect, useRef, useState } from "react";
import { useContent } from "./ContentProvider";

type Msg = { role: "user" | "assistant"; content: string };

function newSessionId() {
  return "s_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function AgentChat() {
  const { content, locale } = useContent();
  const a = content.agent;
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: a.starter }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const sessionId = useRef<string>(newSessionId());
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || busy) return;
    const next = [...messages, { role: "user" as const, content: clean }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionId.current,
          messages: next.filter((m) => m.role === "user" || m.role === "assistant"),
          locale,
        }),
      });
      const data = await res.json();
      const reply = data.offline ? a.offline : data.reply || data.error || a.offline;
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: a.offline }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 560, margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", height: 560 }}>
      <div style={{ padding: "0" }}>
        <div className="ttl">{a.chatTitle}</div>
        <div className="sub">{a.chatSub}</div>
      </div>

      <div ref={scroller} className="chatwin" style={{ marginTop: 16, flex: 1, minHeight: 280, overflowY: "auto", paddingInlineEnd: 4, display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role === "user" ? "user he" : "bot"}`}>
            {m.content}
          </div>
        ))}
        {busy && <div className="msg bot" style={{ opacity: 0.6 }}>…</div>}
      </div>

      <form
        className="chatbar"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        style={{ marginTop: "auto" }}
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

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
        {a.suggestions.map((s) => (
          <button key={s} className="newp" style={{ cursor: "pointer", fontSize: 12 }} onClick={() => send(s)} disabled={busy}>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
