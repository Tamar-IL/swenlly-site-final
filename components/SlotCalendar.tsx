"use client";

import { useMemo, useState } from "react";

export type Slot = { iso: string; time: string };
export type Day = { day: string; label: string; slots: Slot[] };

/** "2026-09-16" → {y, m, d}, with no timezone involved. The server already
 *  resolved these to Israel calendar days; here they are just labels. */
function parts(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return { y, m, d };
}

const HE_MONTHS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];
const HE_DOW = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];
const EN_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const EN_DOW = ["S", "M", "T", "W", "T", "F", "S"];

/**
 * A month grid of the days the server says are open, and the times inside the
 * one that is picked.
 *
 * The grid is built from the available days rather than from a date library:
 * a cell is clickable only if the server listed that exact day, so every rule
 * behind it — notice, horizon, Shabbat, chagim, the daily cap — is already
 * applied by the time anything is drawn.
 */
export function SlotCalendar({
  days,
  daySelected,
  onSelectDay,
  slotSelected,
  onSelectSlot,
  locale,
  labels,
}: {
  days: Day[];
  daySelected: string;
  onSelectDay: (day: string) => void;
  slotSelected: string;
  onSelectSlot: (iso: string) => void;
  locale: string;
  labels: { day: string; time: string; noSlots: string; prev: string; next: string };
}) {
  const open = useMemo(() => new Map(days.map((d) => [d.day, d])), [days]);
  const months = useMemo(() => {
    // Only months that actually contain an open day are reachable.
    const seen = new Set<string>();
    for (const d of days) {
      const { y, m } = parts(d.day);
      seen.add(`${y}-${String(m).padStart(2, "0")}`);
    }
    return [...seen].sort();
  }, [days]);

  const [monthIdx, setMonthIdx] = useState(() => {
    if (!daySelected) return 0;
    const { y, m } = parts(daySelected);
    const key = `${y}-${String(m).padStart(2, "0")}`;
    const i = months.indexOf(key);
    return i < 0 ? 0 : i;
  });

  const current = months[Math.min(monthIdx, months.length - 1)];
  const monthNames = locale === "en" ? EN_MONTHS : HE_MONTHS;
  const dow = locale === "en" ? EN_DOW : HE_DOW;

  const cells = useMemo(() => {
    if (!current) return [];
    const [y, m] = current.split("-").map(Number);
    // Date.UTC keeps this off the viewer's timezone — these are plain labels.
    const firstDow = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
    const total = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const out: ({ day: string; n: number } | null)[] = [];
    for (let i = 0; i < firstDow; i++) out.push(null);
    for (let n = 1; n <= total; n++) {
      out.push({ day: `${y}-${String(m).padStart(2, "0")}-${String(n).padStart(2, "0")}`, n });
    }
    return out;
  }, [current]);

  const picked = open.get(daySelected);

  if (!months.length) return <p className="formstatus err">{labels.noSlots}</p>;

  return (
    <>
      <div className="cal">
        <div className="cal-head">
          <button
            type="button"
            className="cal-nav"
            aria-label={labels.prev}
            disabled={monthIdx === 0}
            onClick={() => setMonthIdx((i) => Math.max(0, i - 1))}
          >
            ›
          </button>
          <div className="cal-title">
            {current && `${monthNames[Number(current.split("-")[1]) - 1]} ${current.split("-")[0]}`}
          </div>
          <button
            type="button"
            className="cal-nav"
            aria-label={labels.next}
            disabled={monthIdx >= months.length - 1}
            onClick={() => setMonthIdx((i) => Math.min(months.length - 1, i + 1))}
          >
            ‹
          </button>
        </div>

        <div className="cal-grid" role="grid" aria-label={labels.day}>
          {dow.map((d, i) => (
            <div key={`${d}-${i}`} className="cal-dow" aria-hidden="true">
              {d}
            </div>
          ))}
          {cells.map((cell, i) =>
            cell === null ? (
              <div key={`pad-${i}`} className="cal-pad" aria-hidden="true" />
            ) : (
              <button
                key={cell.day}
                type="button"
                className={`cal-day ${open.has(cell.day) ? "free" : "off"} ${
                  cell.day === daySelected ? "on" : ""
                }`}
                disabled={!open.has(cell.day)}
                aria-pressed={cell.day === daySelected}
                aria-label={open.get(cell.day)?.label || String(cell.n)}
                onClick={() => onSelectDay(cell.day)}
              >
                <span className="cal-n">{cell.n}</span>
                {open.has(cell.day) && <span className="cal-dot" aria-hidden="true" />}
              </button>
            )
          )}
        </div>
      </div>

      {picked && (
        <div className="fld">
          <label htmlFor="cal-times">
            {labels.time} · {picked.label}
          </label>
          <div className="chiprow" id="cal-times" role="group" aria-label={labels.time}>
            {picked.slots.map((s) => (
              <button
                key={s.iso}
                type="button"
                className={`chip ${s.iso === slotSelected ? "on" : ""}`}
                aria-pressed={s.iso === slotSelected}
                onClick={() => onSelectSlot(s.iso)}
              >
                {s.time}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
