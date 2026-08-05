"use client";

import { useState } from "react";
import { useContent } from "./ContentProvider";

export function BookingForm() {
  const { content, locale } = useContent();
  const f = content.booking.form;
  const [state, setState] = useState<"idle" | "sending" | "ok" | "err">("idle");
  const [msg, setMsg] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    if (fd.get("company")) return; // honeypot
    setState("sending");
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          phone: fd.get("phone"),
          email: fd.get("email"),
          slot: fd.get("slot"),
          topic: fd.get("topic"),
          locale,
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
        <label htmlFor="bf-name">{f.name}</label>
        <input id="bf-name" name="name" required autoComplete="name" />
      </div>
      <div className="fld">
        <label htmlFor="bf-phone">{f.phone}</label>
        <input id="bf-phone" name="phone" required inputMode="tel" autoComplete="tel" />
      </div>
      <div className="fld">
        <label htmlFor="bf-email">{f.email}</label>
        <input id="bf-email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="fld">
        <label htmlFor="bf-slot">{f.slot}</label>
        <input id="bf-slot" name="slot" required type="datetime-local" />
      </div>
      <div className="fld">
        <label htmlFor="bf-topic">{f.topic}</label>
        <input id="bf-topic" name="topic" />
      </div>
      <input className="hp" type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <button className="pill pill-w" type="submit" disabled={state === "sending"}>
          {state === "sending" ? f.sending : f.submit}
        </button>
        {msg && <span className={`formstatus ${state === "ok" ? "ok" : "err"}`}>{msg}</span>}
      </div>
      <p className="formnote">{content.booking.note}</p>
    </form>
  );
}
