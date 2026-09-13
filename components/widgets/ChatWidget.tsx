"use client";

import { useState } from "react";
import { AgentChat } from "../AgentChat";
import { useContent } from "../ContentProvider";

export function ChatWidget() {
  const { content } = useContent();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        aria-label={content.agent.chatTitle}
        onClick={() => setOpen((o) => !o)}
        style={{
          position: "fixed",
          insetInlineEnd: 22,
          bottom: 22,
          zIndex: 80,
          height: 54,
          width: 54,
          padding: 0,
          borderRadius: 999,
          border: "1px solid var(--line2)",
          background: "rgba(31,31,31,.85)",
          color: "var(--tx)",
          fontFamily: "var(--disp)",
          fontWeight: 700,
          fontSize: 15,
          cursor: "pointer",
          boxShadow: "0 14px 34px -18px rgba(0,0,0,.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backdropFilter: "blur(8px)",
          overflow: "hidden",
        }}
      >
        {open ? "✕" : <img src="/brand/swenlly-chat-icon.webp" alt="סוונלי" loading="lazy" decoding="async" style={{ height: "100%", width: "100%", objectFit: "cover", opacity: 0.9 }} />}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={content.agent.chatTitle}
          style={{
            position: "fixed",
            insetInlineEnd: 22,
            bottom: 88,
            zIndex: 80,
            width: "min(400px, calc(100vw - 44px))",
          }}
        >
          <AgentChat />
        </div>
      )}
    </>
  );
}
