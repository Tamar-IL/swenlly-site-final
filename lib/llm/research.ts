// The prep note that lands in swenlly's inbox when a meeting is booked.
//
// The links are built in code from the details the visitor typed, not asked of
// the model: a search URL is always real, whereas an invented homepage is a
// dead link five minutes before a call. The model writes the reading of the
// business — what the field looks like, where automation usually pays off, what
// to ask on the call.

import { complete } from "./index";

export type ResearchInput = {
  business: string;
  field?: string;
  topic: string;
  locale: string;
};

export type ResearchLink = { label: string; url: string };

function q(text: string): string {
  return encodeURIComponent(text.trim());
}

/** Search entry points for the business and its field. Always resolvable. */
export function researchLinks(input: ResearchInput): ResearchLink[] {
  const name = input.business.trim();
  const field = (input.field || "").trim();
  const links: ResearchLink[] = [];
  if (name) {
    links.push({ label: `חיפוש: ${name}`, url: `https://www.google.com/search?q=${q(name)}` });
    links.push({ label: `${name} במפות`, url: `https://www.google.com/maps/search/${q(name)}` });
    links.push({
      label: `${name} בלינקדאין`,
      url: `https://www.linkedin.com/search/results/all/?keywords=${q(name)}`,
    });
    links.push({
      label: `${name} בפייסבוק`,
      url: `https://www.facebook.com/search/top?q=${q(name)}`,
    });
  }
  if (field) {
    links.push({
      label: `סקירת תחום: ${field}`,
      url: `https://www.google.com/search?q=${q(`${field} בישראל שוק מגמות`)}`,
    });
    links.push({
      label: `חדשות בתחום: ${field}`,
      url: `https://news.google.com/search?q=${q(field)}&hl=he`,
    });
    links.push({
      label: `אוטומציה ו־AI ב${field}`,
      url: `https://www.google.com/search?q=${q(`${field} אוטומציה AI ייעול תהליכים`)}`,
    });
  }
  return links;
}

const SYSTEM = `אתה אנליסט עסקי של סוונלי — סטודיו שבונה סוכני AI, מערכות CRM, טפסים דיגיטליים, אוטומציות ומערכות חכמות לעסקים קטנים ובינוניים בישראל.
לפניך פרטים שלקוח מילא כשקבע שיחת ייעוץ. כתוב תדריך קצר לקראת השיחה, בעברית, בטקסט רגיל בלי Markdown, במבנה הזה בדיוק:

מה כנראה העסק עושה: משפט או שניים.
איך התחום עובד: 2–3 נקודות על מודל ההכנסה, הלקוחות ועונתיות אם רלוונטי.
איפה אוטומציה משתלמת שם: 3 נקודות קונקרטיות, כל אחת עם השירות של סוונלי שמתאים לה.
שאלות לשיחה: 3 שאלות פתוחות.

חוקים: אל תמציא עובדות ספציפיות על העסק הזה (מחזור, ותק, לקוחות, כתובת) — אם משהו לא ידוע, אמור שצריך לברר. אל תכתוב כתובות אתרים. עד 200 מילים.`;

/**
 * The model's take on the business. Returns null when no LLM key is set — the
 * email still goes out, just without the brief.
 */
export async function businessBrief(input: ResearchInput): Promise<string | null> {
  const details = [
    `שם העסק: ${input.business || "לא נמסר"}`,
    `תחום: ${input.field || "לא נמסר"}`,
    `הנושא שביקשו לדבר עליו: ${input.topic || "לא נמסר"}`,
  ].join("\n");
  return complete(SYSTEM, details);
}
