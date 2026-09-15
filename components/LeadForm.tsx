"use client";

import { useState } from "react";
import Link from "next/link";
import { useContent } from "./ContentProvider";

export function LeadForm() {
  const { content, locale } = useContent();
  const f = content.contact.form;
  const [state, setState] = useState<"idle" | "sending" | "ok" | "err">("idle");
  const [msg, setMsg] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    if (fd.get("company")) return; // honeypot

    // The form sets noValidate, so the browser will not enforce `required` —
    // check here instead of letting the visitor round-trip to a server error.
    const name = String(fd.get("name") || "").trim();
    const phone = String(fd.get("phone") || "").trim();
    if (!name || !phone) {
      setState("err");
      setMsg(f.missingErr);
      return;
    }
    if (!fd.get("consent")) {
      setState("err");
      setMsg(f.consentErr);
      return;
    }
    setState("sending");
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          phone: fd.get("phone"),
          email: fd.get("email"),
          message: fd.get("message"),
          source: "contact",
          locale,
          consent: true,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setState("ok");
        setMsg(f.ok);
        form.reset();
      } else {
        setState("err");
        setMsg(data.error || f.err);
      }
    } catch {
      setState("err");
      setMsg(f.err);
    }
  }

  return (
    <form className="formgrid" onSubmit={onSubmit} noValidate>
      <div className="fld">
        <label htmlFor="lf-name">{f.name}</label>
        <input id="lf-name" name="name" required autoComplete="name" />
      </div>
      <div className="fld">
        <label htmlFor="lf-phone">{f.phone}</label>
        <input id="lf-phone" name="phone" required inputMode="tel" autoComplete="tel" />
      </div>
      <div className="fld">
        <label htmlFor="lf-email">{f.email}</label>
        <input id="lf-email" name="email" type="email" autoComplete="email" />
      </div>
      <div className="fld">
        <label htmlFor="lf-message">{f.message}</label>
        <textarea id="lf-message" name="message" />
      </div>
      <div className="fld" style={{ marginTop: 16, display: "flex", gap: 10, alignItems: "flex-start" }}>
        <input
          id="lf-consent"
          name="consent"
          type="checkbox"
          required
          /* accentColor recolours the native tick — the browser default is blue */
          style={{ marginTop: 2, width: 18, height: 18, cursor: "pointer", flexShrink: 0, accentColor: "var(--green)" }}
        />
        <label htmlFor="lf-consent" style={{ cursor: "pointer", fontSize: 14 }}>
          {f.consent}{" "}
          <Link href={`/${locale}/privacy`} className="consentlink">
            {content.consent.policyLink}
          </Link>
        </label>
      </div>
      <input className="hp" type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <button className="btn" type="submit" disabled={state === "sending"} style={{ marginTop: 20, width: "100%" }}>
        {state === "sending" ? f.sending : f.submit}
      </button>
      {msg && <span className={`formstatus ${state === "ok" ? "ok" : "err"}`}>{msg}</span>}
      <p className="formnote">{f.note}</p>
    </form>
  );
}
