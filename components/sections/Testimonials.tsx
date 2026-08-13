"use client";

import { useState } from "react";
import Image, { type StaticImageData } from "next/image";
import gili from "@/public/avatars/gili.webp";
import shoshi from "@/public/avatars/shoshi.jpg";
import chani from "@/public/avatars/chani.webp";
import tene from "@/public/avatars/tene.jpg";

/* Verbatim testimonials extracted from the client's own screenshots. Do not edit the text. */
type Item = {
  img: StaticImageData;
  name: string;
  role: string;
  stars: number;
  quote: string;
  /* brand logo instead of a face — shown contained on white, not cropped */
  logo?: boolean;
};

const ITEMS: Item[] = [
  {
    img: gili,
    name: "גילי מרגי",
    role: "רשת חוגי אנגלית לילדים",
    stars: 5,
    quote:
      "תמר אשת מקצוע מאד אמינה, מסורה לעבודה ומקצועית. ממש נהניתי מהשירות שלה והיא עדיין ממשיכה ללוות אותי בכל שאלה והדרכה, ממליצה עליה לקולגות שלי בעסק.",
  },
  {
    img: chani,
    name: "חני אייזנבך",
    role: "גרפיקאית",
    stars: 5,
    quote:
      "נהניתי מאוד מהתהליך העבודה איתך על דף האוטומציה. היית קשובה וסבלנית, וביצעת את כל התיקונים שביקשתי בסבלנות ובמקצועיות, עד שהגענו לתוצאה המושלמת. האוטומציה שבנית לי חוסכת לי המון זמן וכאב ראש ביומיום. תמר, את אלופה!",
  },
  {
    img: tene,
    name: "אסתי בראך",
    role: "טנא הפקות",
    stars: 5,
    logo: true,
    quote:
      "תמר - מהירת הבנה! מקצועית! מעודכנת אונליין בכל הפיתוחים האחרונים! ומה שהופך אותה לנדירה בשוק.. - כי הרבה יותר מהידע - תמר מבינה את הצורך. יודעת לתת לו שם, ופשוט גורמת לקסם לקרות! וכל פעם שאני נתקעת עם בעיה. שאלה. היא מיד עונה: “תשאירי לי. אני מטפלת.” היא אלופת העולמות והחיבורים של מערכות ומימשקים!",
  },
  {
    img: shoshi,
    name: "שושי גבאי",
    role: "קופירייטרית",
    stars: 5,
    quote:
      "תודה על הבוט המדהים, עושה את העבודה ומחמם לידים מקסים. תהליך הבנייה נעשה עם המון שיתוף ושירות אדיב ומושלם, שימת לב לפרטים וראש גדול.",
  },
];

/* one row of three at a time — the rest live behind the arrows */
const PER_VIEW = 3;
const PAGES = Math.max(1, ITEMS.length - PER_VIEW + 1);

export function Testimonials() {
  const [start, setStart] = useState(0);
  const visible = ITEMS.slice(start, start + PER_VIEW);

  return (
    <>
      <div className="tcgrid">
        {visible.map((t) => (
          <div className="card tc hoverable" key={t.name}>
            <div className={t.logo ? "avatar logo" : "avatar"}>
              <Image src={t.img} alt={t.name} width={68} height={68} />
            </div>
            <div className="n">{t.name}</div>
            <div className="r">{t.role}</div>
            <blockquote>{t.quote}</blockquote>
            <div className="stars" aria-label={`${t.stars} כוכבים`}>
              {"★".repeat(t.stars)}
            </div>
          </div>
        ))}
      </div>

      {PAGES > 1 && (
        <div className="tcnav">
          <button
            type="button"
            className="prev"
            aria-label="הקודם"
            disabled={start === 0}
            onClick={() => setStart((s) => Math.max(0, s - 1))}
          >
            <Chevron />
          </button>
          <div className="tcdots" aria-hidden="true">
            {Array.from({ length: PAGES }, (_, i) => (
              <span key={i} className={i === start ? "on" : undefined} />
            ))}
          </div>
          <button
            type="button"
            aria-label="הבא"
            disabled={start >= PAGES - 1}
            onClick={() => setStart((s) => Math.min(PAGES - 1, s + 1))}
          >
            <Chevron />
          </button>
        </div>
      )}
    </>
  );
}

/* points inline-forward; .tcnav CSS mirrors it per direction and per button */
function Chevron() {
  return (
    <svg
      className="ico"
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 5 8 12l7 7" />
    </svg>
  );
}
