// Resend email adapter. Gracefully no-ops (logs) when RESEND_API_KEY is absent.

import type { Booking } from "./bookings-store";
import { buildIcs } from "./ics";
import { SLOT_MINUTES } from "./availability";
import { formatSlot } from "./time";

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


/* The brand palette, as the emails can use it. The site is dark, but a fully
   dark email is a gamble: Gmail inverts it, Outlook drops background colours,
   and it prints badly. A dark header band over a light card carries the brand
   and still renders everywhere. */
const INK = "#141414";
const GREEN = "#94C93D";
const GREEN_INK = "#3f5a17";
const PAPER = "#ffffff";
const WASH = "#f4f4f1";
const LINE = "#e6e6e2";
const MUTED = "#8a8a84";
const TEXT = "#1f1f1f";

/* Absolute — an email has no origin to resolve a relative path against. A PNG
   copy of the site's own wordmark: Outlook still will not render the webp the
   site uses, and the AI variant is a product mark, not the company one. */
const LOGO = `${SITE}/brand/swenlly-wordmark-white-email.png`;

/**
 * The wrapper every email shares: dark masthead with the wordmark, a green
 * hairline, the content on white, and a quiet footer.
 *
 * Tables rather than flex or grid, because Outlook renders neither.
 * `preheader` is the grey line inboxes show next to the subject; without one
 * they scrape the first words of the body, which here would be a date.
 */
function shell(title: string, body: string, preheader = ""): string {
  return `<div dir="rtl" style="margin:0;padding:0;background:${WASH}">
  ${
    preheader
      ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</div>`
      : ""
  }
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${WASH};padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:${PAPER};border:1px solid ${LINE};border-radius:18px;overflow:hidden;font-family:Arial,Helvetica,sans-serif">

        <tr><td style="background:${INK};padding:22px 26px" align="right">
          <img src="${LOGO}" alt="swenlly" width="132" height="30"
               style="display:block;width:132px;height:auto;border:0;outline:none;text-decoration:none">
        </td></tr>
        <tr><td style="height:3px;background:${GREEN};font-size:0;line-height:0">&nbsp;</td></tr>

        <tr><td style="padding:26px">
          <h1 style="margin:0 0 16px;font-size:21px;line-height:1.3;color:${TEXT};font-weight:bold">${esc(title)}</h1>
          ${body}
        </td></tr>

        <tr><td style="padding:18px 26px;background:${WASH};border-top:1px solid ${LINE}">
          <p style="margin:0;font-size:12px;line-height:1.7;color:${MUTED}">
            סוונלי אוטומציות · <a href="${SITE}" style="color:${MUTED}">${SITE.replace(/^https?:\/\//, "")}</a><br>
            מערכות חכמות, סוכני AI ואוטומציות לעסקים.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</div>`;
}

/** A filled button. `<a>` styled as one — email clients do not run buttons. */
function button(label: string, href: string, kind: "solid" | "ghost" = "solid"): string {
  const style =
    kind === "solid"
      ? `background:${INK};color:#ffffff;border:1px solid ${INK}`
      : `background:${PAPER};color:${TEXT};border:1px solid ${LINE}`;
  return `<a href="${esc(href)}" style="display:inline-block;${style};text-decoration:none;font-size:14px;font-weight:bold;padding:12px 20px;border-radius:999px;font-family:Arial,Helvetica,sans-serif">${esc(label)}</a>`;
}

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:7px 0;font-size:13px;color:${MUTED};white-space:nowrap;vertical-align:top">${esc(label)}</td>
    <td style="padding:7px 0 7px 14px;font-size:14.5px;color:${TEXT};vertical-align:top">${esc(value)}</td>
  </tr>`;
}

function link(label: string, url: string): string {
  return `<tr>
    <td style="padding:7px 0;font-size:13px;color:${MUTED};white-space:nowrap;vertical-align:top">${esc(label)}</td>
    <td style="padding:7px 0 7px 14px;font-size:14px;vertical-align:top"><a href="${esc(url)}" style="color:${GREEN_INK};word-break:break-all">${esc(url)}</a></td>
  </tr>`;
}

function details(b: Booking): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;border-top:1px solid ${LINE};border-bottom:1px solid ${LINE};margin:4px 0 2px">` + [
    row("מועד", b.slotLabel),
    row("משך", `${SLOT_MINUTES} דקות`),
    b.meetLink ? link("קישור לפגישה (Google Meet)", b.meetLink) : "",
    row("שם העסק", b.business),
    b.field ? row("תחום", b.field) : "",
    row("נושא השיחה", b.topic),
    row("איש קשר", `${b.name} · ${b.phone} · ${b.email}`),
  ].join("") + `</table>`;
}

/** Where the client goes to move or cancel. The token IS the authorisation, so
 *  it only ever travels to the address that booked the meeting — and to us. */
export function manageUrl(b: Booking): string {
  const locale = b.locale === "en" ? "en" : "he";
  return `${SITE}/${locale}/booking/manage?t=${encodeURIComponent(b.token)}`;
}

function manageButtons(b: Booking): string {
  const url = manageUrl(b);
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:20px">
    <tr>
      <td style="padding-inline-end:10px">${button("שינוי מועד", `${url}&a=move`)}</td>
      <td>${button("ביטול הפגישה", `${url}&a=cancel`, "ghost")}</td>
    </tr>
  </table>
  <p style="margin-top:10px;font-size:12px;color:${MUTED}">הקישורים אישיים — עדיף לא להעביר אותם הלאה.</p>`;
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
    meetLink: b.meetLink,
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
      `<p style="margin:0 0 18px;font-size:14.5px;line-height:1.7;color:${TEXT}">היי ${esc(b.name)}, קבענו. אלה הפרטים:</p>
       ${details(b)}
       ${b.meetLink ? `<div style="margin-top:20px">${button("הצטרפות לשיחה", b.meetLink)}</div>` : ""}
       <p style="margin-top:18px;font-size:14px;line-height:1.7;color:#4a4a45">${
         b.meetLink
           ? "השיחה היא בגוגל מיט — אפשר להצטרף מהקישור שלמעלה, והוא מחכה גם בהזמנה המצורפת ליומן."
           : "נשלח את קישור השיחה לפני המועד."
       } נשלח תזכורת שעה לפני.</p>
       <p style="margin-top:18px;font-size:14px;line-height:1.7;color:#4a4a45">צריך לשנות מועד או לבטל? אפשר לעשות את זה לבד, כאן:</p>
       ${manageButtons(b)}`
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
    ? `<h3 style="margin:24px 0 8px;font-size:15px;color:${TEXT}">תדריך לקראת השיחה</h3>
       <div style="font-size:14px;line-height:1.75;color:${TEXT};white-space:pre-wrap">${esc(brief)}</div>`
    : `<p style="margin-top:20px;font-size:13px;color:${MUTED}">אין תדריך AI — לא מוגדר מפתח LLM בשרת.</p>`;
  const linksHtml = links.length
    ? `<h3 style="margin:24px 0 8px;font-size:15px;color:${TEXT}">ללמוד על העסק והתחום</h3>
       <ul style="padding-inline-start:18px;margin:0;font-size:14px;line-height:1.9">
       ${links.map((l) => `<li><a href="${esc(l.url)}" style="color:${GREEN_INK}">${esc(l.label)}</a></li>`).join("")}
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
       ${link("ניהול הפגישה (שינוי מועד / ביטול)", manageUrl(b))}
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
    html: shell(
      "תזכורת לפגישה",
      `<p style="margin:0 0 18px;font-size:14.5px;line-height:1.7;color:${TEXT}">${opening}</p>${details(b)}${
        to === "client" ? manageButtons(b) : link("ניהול הפגישה", manageUrl(b))
      }`
    ),
  });
}

/** Both sides, after a meeting was moved. Carries the old time so nobody has to
 *  dig through their inbox to work out what changed. */
export async function sendRescheduled(b: Booking): Promise<boolean> {
  const was = b.movedFrom ? `<p style="margin:10px 0 0;font-size:13px;color:${MUTED}">היה: ${esc(b.movedFrom)}</p>` : "";
  const client = send({
    from: FROM,
    to: b.email,
    reply_to: REPLY_TO,
    subject: `המועד עודכן · ${b.slotLabel}`,
    html: shell(
      "המועד עודכן",
      `<p style="margin:0 0 18px;font-size:14.5px;line-height:1.7;color:${TEXT}">היי ${esc(b.name)}, הזזנו את הפגישה. אלה הפרטים החדשים:</p>
       ${details(b)}${was}
       <p style="margin-top:18px;font-size:14px;line-height:1.7;color:#4a4a45">${
         b.meetLink ? "קישור השיחה לא השתנה — אותו קישור עובד גם במועד החדש." : ""
       }</p>
       ${manageButtons(b)}`
    ),
    attachments: [icsAttachment(b)],
  });
  const owner = send({
    from: FROM,
    to: NOTIFY,
    reply_to: b.email || REPLY_TO,
    subject: `מועד עודכן · ${esc(b.business || b.name)} · ${esc(b.slotLabel)}`,
    html: shell("מועד עודכן", `${details(b)}${was}${link("ניהול הפגישה", manageUrl(b))}`),
    attachments: [icsAttachment(b)],
  });
  const [a, c] = await Promise.all([client, owner]);
  return a || c;
}

/** Both sides, after a meeting was cancelled. */
export async function sendCancelled(b: Booking): Promise<boolean> {
  const client = send({
    from: FROM,
    to: b.email,
    reply_to: REPLY_TO,
    subject: `הפגישה בוטלה · ${b.slotLabel}`,
    html: shell(
      "הפגישה בוטלה",
      `<p style="margin:0 0 14px;font-size:14.5px;line-height:1.7;color:${TEXT}">היי ${esc(b.name)}, ביטלנו את הפגישה שהייתה קבועה ל־${esc(b.slotLabel)}. לא נשלח יותר תזכורות.</p>
       <p style="margin-top:16px;font-size:14px;line-height:1.7;color:#4a4a45">בכל שלב אפשר לקבוע מחדש: <a href="${esc(SITE)}/${b.locale === "en" ? "en" : "he"}/booking" style="color:${GREEN_INK}">${esc(SITE.replace(/^https?:\/\//, ""))}/booking</a></p>`
    ),
  });
  const owner = send({
    from: FROM,
    to: NOTIFY,
    reply_to: b.email || REPLY_TO,
    subject: `פגישה בוטלה · ${esc(b.business || b.name)} · ${esc(b.slotLabel)}`,
    html: shell("פגישה בוטלה", details(b)),
  });
  const [a, c] = await Promise.all([client, owner]);
  return a || c;
}

// ── Agent transcripts ────────────────────────────────────────────────────────

/**
 * One conversation with the site's agent, sent to the inbox once the person
 * stops typing.
 *
 * Laid out as bubbles rather than a `role: content` dump: these get read while
 * deciding whether to call someone back, and who said what has to be obvious at
 * a glance. Visitor bubbles sit on the reading edge, the agent's on the other,
 * the same way round as the widget on the site.
 */
export function sendAgentTranscript(t: {
  sessionId: string;
  locale: string;
  turns: { role: "user" | "assistant"; content: string }[];
  startedAt: number;
  lastAt: number;
}): Promise<boolean> {
  // Always in Hebrew: the recipient is us, whatever language the visitor chose.
  // Which language they chose is itself worth knowing, so it gets a row.
  const started = formatSlot(new Date(t.startedAt), "he");
  const minutes = Math.max(1, Math.round((t.lastAt - t.startedAt) / 60000));
  const asked = t.turns.filter((m) => m.role === "user").length;

  const bubbles = t.turns
    .map((m) => {
      const visitor = m.role === "user";
      const who = visitor ? "המבקר/ת" : "הסוכן";
      // A visitor bubble is the one worth reading twice, so it gets the ink.
      const bg = visitor ? INK : WASH;
      const fg = visitor ? "#ffffff" : TEXT;
      const border = visitor ? INK : LINE;
      const align = visitor ? "right" : "left";
      // Newlines are the only formatting the chat carries through.
      const text = esc(m.content).replace(/\n/g, "<br>");
      return `<tr><td align="${align}" style="padding:5px 0">
        <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:420px">
          <tr><td style="padding:0 2px 3px;font-size:11px;color:${MUTED}" align="${align}">${who}</td></tr>
          <tr><td dir="auto" style="background:${bg};color:${fg};border:1px solid ${border};border-radius:14px;padding:11px 14px;font-size:14px;line-height:1.7">${text}</td></tr>
        </table>
      </td></tr>`;
    })
    .join("");

  const length =
    `${minutes === 1 ? "דקה" : `${minutes} דקות`} · ` +
    `${t.turns.length} הודעות`;

  const meta = `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;border-top:1px solid ${LINE};border-bottom:1px solid ${LINE};margin:0 0 16px">
    ${row("התחילה", started)}
    ${row("אורך", length)}
    ${row("שפה", t.locale === "en" ? "אנגלית" : "עברית")}
    ${row("מזהה שיחה", t.sessionId)}
  </table>`;

  return send({
    from: FROM,
    to: NOTIFY,
    reply_to: REPLY_TO,
    subject: `שיחה עם הסוכן באתר · ${asked} ${asked === 1 ? "שאלה" : "שאלות"}`,
    html: shell(
      "שיחה עם הסוכן באתר",
      meta +
        `<table role="presentation" cellpadding="0" cellspacing="0" width="100%">${bubbles}</table>` +
        `<p style="margin:18px 0 0;font-size:12px;line-height:1.7;color:${MUTED}">נשלח אחרי שהשיחה נרגעה. פרטי קשר מופיעים כאן רק אם המבקר/ת הקלידו אותם.</p>`,
      t.turns.find((m) => m.role === "user")?.content.slice(0, 120) || ""
    ),
  });
}
