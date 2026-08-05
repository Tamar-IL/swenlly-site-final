"use client";

import { useState } from "react";
import { useContent } from "./ContentProvider";

export function NewsletterForm() {
  const { content } = useContent();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "ok">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setState("sending");
    try {
      await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "ניוזלטר", phone: "-", email, source: "newsletter", locale: content.nav.home }),
      });
    } catch {
      /* graceful: newsletter is best-effort */
    }
    setState("ok");
    setEmail("");
  }

  return (
    <form className="news" onSubmit={onSubmit}>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={content.home.cta.newsPlaceholder}
        aria-label={content.home.cta.newsPlaceholder}
      />
      <button className="pill pill-o" type="submit">
        {state === "ok" ? "✓" : content.home.cta.newsBtn}
      </button>
    </form>
  );
}
