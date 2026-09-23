"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useContent } from "./ContentProvider";
import { SlotCalendar, type Day } from "./SlotCalendar";

type Meeting = {
  slotISO: string;
  slotLabel: string;
  business: string;
  topic: string;
  name: string;
  status: string;
  meetLink: string;
};

type Screen = "loading" | "ready" | "gone" | "done";

export function ManageBooking() {
  const { content, locale } = useContent();
  const m = content.booking.manage;
  const cal = content.booking.calendar;

  const [token, setToken] = useState("");
  const [screen, setScreen] = useState<Screen>("loading");
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [days, setDays] = useState<Day[]>([]);
  const [msg, setMsg] = useState("");
  const [tone, setTone] = useState<"ok" | "err">("ok");
  // "move" or "cancel" comes straight from the button the client pressed in the
  // email, so the page opens on what they already decided to do.
  const [pane, setPane] = useState<"" | "move" | "cancel">("");
  const [dayKey, setDayKey] = useState("");
  const [slot, setSlot] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("t") || "";
    const intent = params.get("a");
    setToken(t);
    if (intent === "move" || intent === "cancel") setPane(intent);
    if (!t) {
      setScreen("gone");
      setMsg(m.invalid);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/booking/manage?t=${encodeURIComponent(t)}&locale=${locale}`);
        const data = await res.json();
        if (!alive) return;
        if (!data.ok) {
          setScreen("gone");
          setMsg(data.error || m.invalid);
          return;
        }
        setMeeting(data.booking);
        setDays(data.days || []);
        if (data.days?.length) setDayKey(data.days[0].day);
        setScreen("ready");
      } catch {
        if (alive) {
          setScreen("gone");
          setMsg(m.invalid);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [locale, m.invalid]);

  const day = useMemo(() => days.find((d) => d.day === dayKey), [days, dayKey]);

  async function act(body: Record<string, unknown>, okMsg: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/booking/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, locale, ...body }),
      });
      const data = await res.json();
      if (!data.ok) {
        setTone("err");
        setMsg(data.error || m.err);
        return;
      }
      setMeeting(data.booking);
      setTone("ok");
      setMsg(okMsg);
      setScreen("done");
    } catch {
      setTone("err");
      setMsg(m.err);
    } finally {
      setBusy(false);
    }
  }

  if (screen === "loading") return <p className="formnote">{m.loading}</p>;

  if (screen === "gone") {
    return (
      <>
        <p className="formstatus err">{msg}</p>
        <p style={{ marginTop: 16 }}>
          <Link href={`/${locale}/booking`} className="consentlink">
            {m.rebook}
          </Link>
        </p>
      </>
    );
  }

  const cancelled = meeting?.status === "cancelled";

  return (
    <>
      <section className="bookstep">
        <h3 className="bookstep-t">{meeting?.slotLabel}</h3>
        <p className="chosenslot">
          {m.business}: <b>{meeting?.business}</b>
        </p>
        <p className="chosenslot">
          {m.topic}: <b>{meeting?.topic}</b>
        </p>
        {meeting?.meetLink && !cancelled && (
          <p className="chosenslot">
            {m.meet}:{" "}
            <a href={meeting.meetLink} className="consentlink" target="_blank" rel="noopener noreferrer">
              {meeting.meetLink}
            </a>
          </p>
        )}
        {cancelled && <p className="formstatus err">{m.cancelledState}</p>}
      </section>

      {msg && <p className={`formstatus ${tone}`}>{msg}</p>}

      {(screen === "done" || cancelled) && (
        <p style={{ marginTop: 16 }}>
          <Link href={`/${locale}/booking`} className="consentlink">
            {m.rebook}
          </Link>
        </p>
      )}

      {screen === "ready" && !cancelled && (
        <>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
            <button
              type="button"
              className={`chip ${pane === "move" ? "on" : ""}`}
              onClick={() => setPane(pane === "move" ? "" : "move")}
            >
              {m.moveBtn}
            </button>
            <button
              type="button"
              className={`chip ${pane === "cancel" ? "on" : ""}`}
              onClick={() => setPane(pane === "cancel" ? "" : "cancel")}
            >
              {m.cancelBtn}
            </button>
          </div>

          {pane === "move" && (
            <section className="bookstep" style={{ marginTop: 16 }}>
              <h3 className="bookstep-t">{m.moveTitle}</h3>
              <p className="formnote">{m.moveIntro}</p>

              <SlotCalendar
                days={days}
                daySelected={dayKey}
                onSelectDay={(d) => {
                  setDayKey(d);
                  setSlot("");
                }}
                slotSelected={slot}
                onSelectSlot={setSlot}
                locale={locale}
                labels={{
                  day: cal.day,
                  time: cal.time,
                  noSlots: cal.empty,
                  prev: cal.prev,
                  next: cal.next,
                }}
              />
              {days.length > 0 && (
                <button
                  type="button"
                  className="pill pill-w"
                  disabled={!slot || busy}
                  onClick={() => act({ action: "reschedule", slot }, m.moved)}
                >
                  {busy ? m.moving : m.moveConfirm}
                </button>
              )}
            </section>
          )}

          {pane === "cancel" && (
            <section className="bookstep" style={{ marginTop: 16 }}>
              <h3 className="bookstep-t">{m.cancelTitle}</h3>
              <p className="formnote">{m.cancelConfirm}</p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="pill pill-w"
                  disabled={busy}
                  onClick={() => act({ action: "cancel" }, m.cancelled)}
                >
                  {busy ? m.cancelling : m.cancelYes}
                </button>
                <button type="button" className="pill pill-o" disabled={busy} onClick={() => setPane("")}>
                  {m.cancelNo}
                </button>
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
