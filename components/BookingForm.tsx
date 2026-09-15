"use client";

import { useEffect, useMemo, useState } from "react";
import { useContent } from "./ContentProvider";

type Slot = { iso: string; time: string };
type Day = { day: string; label: string; slots: Slot[] };
type CalendarState = "loading" | "ready" | "empty" | "error";

export function BookingForm() {
  const { content, locale } = useContent();
  const b = content.booking;
  const f = b.form;
  const cal = b.calendar;

  const [days, setDays] = useState<Day[]>([]);
  const [calState, setCalState] = useState<CalendarState>("loading");
  const [dayKey, setDayKey] = useState<string>("");
  const [slot, setSlot] = useState<string>("");
  const [state, setState] = useState<"idle" | "sending" | "ok" | "err">("idle");
  const [msg, setMsg] = useState("");

  // The calendar is what the server says is open right now, not a static grid:
  // the 14-hour notice, the two-week horizon and every Shabbat and chag are
  // already applied by the time it gets here.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/availability?locale=${locale}`);
        const data = await res.json();
        if (!alive) return;
        if (!data.ok) return setCalState("error");
        const list: Day[] = data.days || [];
        setDays(list);
        setCalState(list.length ? "ready" : "empty");
        if (list.length) setDayKey(list[0].day);
      } catch {
        if (alive) setCalState("error");
      }
    })();
    return () => {
      alive = false;
    };
  }, [locale]);

  const day = useMemo(() => days.find((d) => d.day === dayKey), [days, dayKey]);
  const chosen = useMemo(
    () => days.flatMap((d) => d.slots.map((s) => ({ ...s, label: d.label }))).find((s) => s.iso === slot),
    [days, slot]
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    if (fd.get("company")) return; // honeypot
    if (!slot) {
      setState("err");
      setMsg(f.needSlot);
      return;
    }
    setState("sending");
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot,
          business: fd.get("business"),
          field: fd.get("field"),
          topic: fd.get("topic"),
          name: fd.get("name"),
          phone: fd.get("phone"),
          email: fd.get("email"),
          locale,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setState("ok");
        setMsg(data.slotLabel ? `${f.ok} (${data.slotLabel})` : f.ok);
        form.reset();
        // The slot we just took is gone from the calendar — drop it rather than
        // leave a button that would now be refused.
        setDays((list) =>
          list
            .map((d) => ({ ...d, slots: d.slots.filter((s) => s.iso !== slot) }))
            .filter((d) => d.slots.length)
        );
        setSlot("");
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
      <section className="bookstep">
        <h3 className="bookstep-t">{cal.title}</h3>

        {calState === "loading" && <p className="formnote">{cal.loading}</p>}
        {calState === "error" && <p className="formstatus err">{cal.error}</p>}
        {calState === "empty" && <p className="formstatus err">{cal.empty}</p>}

        {calState === "ready" && (
          <>
            <div className="fld">
              <label htmlFor="bf-days">{cal.day}</label>
              <div className="chiprow" id="bf-days" role="group" aria-label={cal.day}>
                {days.map((d) => (
                  <button
                    key={d.day}
                    type="button"
                    className={`chip ${d.day === dayKey ? "on" : ""}`}
                    aria-pressed={d.day === dayKey}
                    onClick={() => {
                      setDayKey(d.day);
                      setSlot("");
                    }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="fld">
              <label htmlFor="bf-times">{cal.time}</label>
              <div className="chiprow" id="bf-times" role="group" aria-label={cal.time}>
                {(day?.slots || []).map((s) => (
                  <button
                    key={s.iso}
                    type="button"
                    className={`chip ${s.iso === slot ? "on" : ""}`}
                    aria-pressed={s.iso === slot}
                    onClick={() => setSlot(s.iso)}
                  >
                    {s.time}
                  </button>
                ))}
              </div>
            </div>

            {chosen && (
              <p className="chosenslot">
                {cal.chosen}: <b>{chosen.label} · {chosen.time}</b>
              </p>
            )}
          </>
        )}

        <p className="formnote">{cal.rules}</p>
      </section>

      <div className="fld">
        <label htmlFor="bf-business">{f.business}</label>
        <input id="bf-business" name="business" required maxLength={160} autoComplete="organization" />
      </div>
      <div className="fld">
        <label htmlFor="bf-field">{f.field}</label>
        <input id="bf-field" name="field" maxLength={120} />
      </div>
      <div className="fld">
        <label htmlFor="bf-topic">{f.topic}</label>
        <textarea id="bf-topic" name="topic" required maxLength={400} placeholder={f.topicPlaceholder} />
      </div>

      <div className="fld">
        <label htmlFor="bf-name">{f.contact}</label>
        <div className="row3">
          <input id="bf-name" name="name" required placeholder={f.name} aria-label={f.name} autoComplete="name" />
          <input name="phone" required placeholder={f.phone} aria-label={f.phone} inputMode="tel" autoComplete="tel" />
          <input name="email" type="email" required placeholder={f.email} aria-label={f.email} autoComplete="email" />
        </div>
      </div>

      <input className="hp" type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" />

      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <button className="pill pill-w" type="submit" disabled={state === "sending" || calState !== "ready"}>
          {state === "sending" ? f.sending : f.submit}
        </button>
        {msg && <span className={`formstatus ${state === "ok" ? "ok" : "err"}`}>{msg}</span>}
      </div>
      <p className="formnote">{b.note}</p>
    </form>
  );
}
