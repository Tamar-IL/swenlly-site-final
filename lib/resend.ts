// Resend email adapter. Gracefully no-ops (logs) when RESEND_API_KEY is absent.

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

export function notifyBooking(f: { name: string; phone: string; email: string; slot: string; topic?: string }) {
  return send({
    from: FROM,
    to: NOTIFY,
    reply_to: f.email || REPLY_TO,
    subject: `בקשת פגישה · ${esc(f.name)} · ${esc(f.slot)}`,
    html: `<div dir="rtl" style="font-family:Arial">
      <h2>בקשת פגישה חדשה</h2>
      <p><b>שם:</b> ${esc(f.name)}</p>
      <p><b>טלפון:</b> ${esc(f.phone)}</p>
      <p><b>אימייל:</b> ${esc(f.email)}</p>
      <p><b>מועד מבוקש:</b> ${esc(f.slot)}</p>
      <p><b>נושא:</b> ${esc(f.topic || "-")}</p>
    </div>`,
  });
}
