// Resend email adapter. Gracefully no-ops (logs) when RESEND_API_KEY is absent.

import type { Booking } from "./bookings-store";
import { buildIcs } from "./ics";
import { SLOT_MINUTES } from "./availability";

const SITE = process.env.SITE_URL || "https://swenlly.com";

const FROM = "swenlly <no-reply@swenlly.com>";
const REPLY_TO = "info@swenlly.com";
const NOTIFY = process.env.NOTIFY_EMAIL || "info@swenlly.com";

async function send(payload: Record<string, unknown>): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[resend] RESEND_API_KEY not set — email skipped", payload);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error("[resend] send failed", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[resend] send error", err);
    return false;
  }
}

function esc(s: string): string {
  return String(s).replace(/[<>&]/g, (ch) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[ch]!));
}

export function notifyLead(f: { name: string; phone: string; email?: string; message?: string; source: string }) {
  return send({
    from: FROM,
    to: NOTIFY,
    reply_to: f.email || REPLY_TO,
    subject: `ליד חדש מהאתר · ${esc(f.name)}`,
    html: `<div dir="rtl" style="font-family:Arial">
      <h2>ליד חדש</h2>
      <p><b>שם:</b> ${esc(f.name)}</p>
      <p><b>טלפון:</b> ${esc(f.phone)}</p>
      <p><b>אימייל:</b> ${esc(f.email || "-")}</p>
      <p><b>מקור:</b> ${esc(f.source)}</p>
      <p><b>הודעה:</b><br>${esc(f.message || "-")}</p>
    </div>`,
  });
}

// ── Booking emails ───────────────────────────────────────────────────────────


function shell(title: string, body: string): string {
  return `<div dir="rtl" style="font-family:Arial,Helvetica,sans-serif;background:#f6f6f4;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e6e6e2;border-radius:16px;padding:26px">
    <h2 style="margin:0 0 14px;font-size:20px;color:#1f1f1f">${esc(title)}</h2>
    ${body}
    <p style="margin-top:22px;font-size:12px;color:#8a8a84">סוונלי אוטומציות · <a href="${SITE}" style="color:#8a8a84">${SITE.replace(/^https?:\/\//, "")}</a></p>
  </div>
</div>`;
}

function row(label: string, value: string): string {
  return `<p style="margin:6px 0;font-size:14.5px;color:#1f1f1f"><b>${esc(label)}:</b> ${esc(value)}</p>`;
}

function details(b: Booking): string {
  return [
    row("מועד", b.slotLabel),
    row("משך", `${SLOT_MINUTES} דקות`),
    row("שם העסק", b.business),
    b.field ? row("תחום", b.field) : "",
    row("נושא השיחה", b.topic),
    row("איש קשר", `${b.name} · ${b.phone} · ${b.email}`),
  ].join("");
}

function icsAttachment(b: Booking) {
  const ics = buildIcs({
    uid: `${Date.parse(b.slotISO)}-${b.email}@swenlly.com`,
    start: new Date(b.slotISO),
    minutes: SLOT_MINUTES,
    title: `שיחת ייעוץ · סוונלי ו${b.business || b.name}`,
    description: b.topic || "שיחת ייעוץ",
    organizerEmail: NOTIFY,
    attendeeEmail: b.email,
  });
  return {
    filename: "swenlly-meeting.ics",
    content: Buffer.from(ics, "utf8").toString("base64"),
    content_type: "text/calendar; method=REQUEST",
  };
}

/** Confirmation to the client, with the meeting as a calendar invite. */
export function sendBookingConfirmation(b: Booking): Promise<boolean> {
  return send({
    from: FROM,
    to: b.email,
    reply_to: REPLY_TO,
    subject: `הפגישה נקבעה · ${b.slotLabel}`,
    html: shell(
      "הפגישה נקבעה 🎉",
      `<p style="font-size:14.5px;color:#1f1f1f">היי ${esc(b.name)}, קבענו. אלה הפרטים:</p>
       ${details(b)}
       <p style="margin-top:16px;font-size:14px;color:#4a4a45">נשלח תזכורת שעה לפני. צריך לשנות מועד? אפשר פשוט להשיב למייל הזה.</p>`
    ),
    attachments: [icsAttachment(b)],
  });
}

/** The internal copy: same details, plus the AI brief and links to read up. */
export function sendBookingBrief(
  b: Booking,
  brief: string | null,
  links: { label: string; url: string }[]
): Promise<boolean> {
  const briefHtml = brief
    ? `<h3 style="margin:22px 0 8px;font-size:16px;color:#1f1f1f">תדריך לקראת השיחה</h3>
       <div style="font-size:14px;line-height:1.7;color:#1f1f1f;white-space:pre-wrap">${esc(brief)}</div>`
    : `<p style="margin-top:20px;font-size:13px;color:#8a8a84">אין תדריך AI — לא מוגדר מפתח LLM בשרת.</p>`;
  const linksHtml = links.length
    ? `<h3 style="margin:22px 0 8px;font-size:16px;color:#1f1f1f">ללמוד על העסק והתחום</h3>
       <ul style="padding-inline-start:18px;margin:0;font-size:14px;line-height:1.9">
       ${links.map((l) => `<li><a href="${esc(l.url)}" style="color:#1f6f5c">${esc(l.label)}</a></li>`).join("")}
       </ul>`
    : "";
  return send({
    from: FROM,
    to: NOTIFY,
    reply_to: b.email || REPLY_TO,
    subject: `פגישה נקבעה · ${esc(b.business || b.name)} · ${esc(b.slotLabel)}`,
    html: shell(
      "פגישה חדשה ביומן",
      `${details(b)}
       ${row("נקבע דרך", b.source === "agent" ? "הסוכן החכם" : "טופס האתר")}
       ${briefHtml}
       ${linksHtml}`
    ),
    attachments: [icsAttachment(b)],
  });
}

/** The hour-before reminder. Same body, different address and opening line. */
export function sendReminder(b: Booking, to: "client" | "owner"): Promise<boolean> {
  const opening =
    to === "client"
      ? `היי ${esc(b.name)}, מזכירים — הפגישה שלנו מתחילה בעוד כשעה.`
      : `תזכורת: פגישה עם ${esc(b.business || b.name)} בעוד כשעה.`;
  return send({
    from: FROM,
    to: to === "client" ? b.email : NOTIFY,
    reply_to: to === "client" ? REPLY_TO : b.email || REPLY_TO,
    subject: `תזכורת · פגישה בעוד שעה · ${esc(b.slotLabel)}`,
    html: shell("תזכורת לפגישה", `<p style="font-size:14.5px;color:#1f1f1f">${opening}</p>${details(b)}`),
  });
}
