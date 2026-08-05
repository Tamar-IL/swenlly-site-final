import Image from "next/image";
import gili from "@/public/avatars/gili.webp";
import shoshi from "@/public/avatars/shoshi.jpg";
import chani from "@/public/avatars/chani.webp";

/* Verbatim testimonials extracted from the client's own screenshots. Do not edit the text. */
const ITEMS = [
  {
    img: gili,
    name: "גילי מרגי",
    role: "רשת חוגי אנגלית לילדים",
    stars: 5,
    quote:
      "תמר אשת מקצוע מאד אמינה, מסורה לעבודה ומקצועית. ממש נהניתי מהשירות שלה והיא עדיין ממשיכה ללוות אותי בכל שאלה והדרכה, ממליצה עליה לקולגות שלי בעסק.",
  },
  {
    img: shoshi,
    name: "שושי גבאי",
    role: "קופירייטרית",
    stars: 5,
    quote:
      "תודה על הבוט המדהים, עושה את העבודה ומחמם לידים מקסים. תהליך הבנייה נעשה עם המון שיתוף ושירות אדיב ומושלם, שימת לב לפרטים וראש גדול.",
  },
  {
    img: chani,
    name: "חני אייזנבך",
    role: "גרפיקאית",
    stars: 5,
    quote:
      "נהניתי מאוד מהתהליך העבודה איתך על דף האוטומציה. היית קשובה וסבלנית, וביצעת את כל התיקונים שביקשתי בסבלנות ובמקצועיות, עד שהגענו לתוצאה המושלמת. האוטומציה שבנית לי חוסכת לי המון זמן וכאב ראש ביומיום. תמר, את אלופה!",
  },
];

export function Testimonials() {
  return (
    <div className="tcgrid">
      {ITEMS.map((t) => (
        <div className="card tc hoverable" key={t.name}>
          <div className="avatar">
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
  );
}
