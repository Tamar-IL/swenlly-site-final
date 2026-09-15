"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useContent } from "./ContentProvider";
import { Turnstile, type TurnstileHandle } from "./Turnstile";

export function NewsletterForm() {
  const { content, locale } = useContent();
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const captcha = useRef<TurnstileHandle | null>(null);
  const [state, setState] = useState<"idle" | "sending" | "ok" | "err">("idle");
  const [msg, setMsg] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "sending") return;
    // noValidate, like every other form here, so the messages stay Hebrew
    // instead of whatever language the browser's own bubble happens to be in.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setState("err");
      setMsg(content.consent.emailErr);
      return;
    }
    // An email address is personal data even when it is the only field asked
    // for, so nothing is sent until the box is ticked — and the server refuses
    // the same way, because a checkbox alone protects nobody.
    if (!consent) {
      setState("err");
      setMsg(content.consent.err);
      return;
    }
    setState("sending");
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "ניוזלטר",
          phone: "-",
          email,
          source: "newsletter",
          locale,
          consent: true,
          // Without this /api/lead rejects the signup outright whenever
          // TURNSTILE_SECRET is set — the widget is not decoration.
          turnstileToken: token ?? undefined,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setState("err");
        setMsg(data.error || content.consent.err);
        captcha.current?.reset();
        return;
      }
    } catch {
      /* graceful: the newsletter is best-effort */
    }
    setState("ok");
    setMsg("");
    setEmail("");
    setConsent(false);
    // A token is single-use, so re-arm the widget for the next signup.
    captcha.current?.reset();
  }

  return (
    <form className="news" onSubmit={onSubmit} noValidate>
      <div className="newsrow">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={content.home.cta.newsPlaceholder}
          aria-label={content.home.cta.newsPlaceholder}
        />
        <button className="pill pill-o" type="submit" disabled={state === "sending"}>
          {state === "ok" ? "✓" : content.home.cta.newsBtn}
        </button>
      </div>

      <label className="newsconsent" htmlFor="nl-consent">
        <input
          id="nl-consent"
          name="consent"
          type="checkbox"
          required
          checked={consent}
          onChange={(e) => {
            setConsent(e.target.checked);
            if (e.target.checked && state === "err") setState("idle");
          }}
        />
        <span>
          {content.consent.newsletter}{" "}
          <Link href={`/${locale}/privacy`} className="consentlink">
            {content.consent.policyLink}
          </Link>
        </span>
      </label>

      <Turnstile locale={locale} onToken={setToken} onReady={(h) => (captcha.current = h)} />

      {state === "err" && msg && <span className="formstatus err">{msg}</span>}
    </form>
  );
}
