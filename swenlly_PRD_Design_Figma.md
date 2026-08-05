# swenlly — PRD עיצוב (Figma)

Design Specification Document for an International Corporate Website ·
Concept: **Living System** · Dark · RTL/LTR

---

## 0. Super-Principles (the DNA of the design)

> **Required source of inspiration:** The `inspirations/` folder in the project. It should be treated with seriousness — from which the hierarchy, grid division, card shapes and colors are derived.

| Principle | What does this mean in practice |
|---|---|
| **Deep black as a base** | The background is almost black (`#07090A`), not gray. A sense of depth, premium, "a screen that is off that wakes up". |
| **Thin lines, rounded corners** | Each separation is a `1px` hairline in **dark gray** (`#1c1c1c`), **not white** (the white is blinding). **Rounded** corners — `16px` cards, `24px` large panels. (Updated according to the live review.) |
| **Green only as a touch** | `#94C93D` is accent only — line, dot, single word, hover/focus mode. **No** large green areas. |
| **Dark cards with thin border** | bento-cards on `#0B0F0E` background, `#1c1c1c` dark-gray border (not white), `16px` rounded corners. Green only comes in on hover/active. |
| **Looks like the work of a senior designer** | The site should look like it was designed by a graphic designer with 20 years of experience and high expertise: restraint, precision, intention. **It is** allowed to talk about products that include AI (this is the core business of swenlly). **It is** forbidden for the design itself to look AI-produced — no generic color gradients, no neon glow, no particle animations, no "AI" stock images. |
| **Filtered audience** | Zero people/stock photos. Trust is built through real UI-mockups, price transparency, recommendations and process storytelling. |

**Guiding references (IA, grid, motion, interactions):** Vercel · NLPearl. Derived from: bento-grid, hairline borders, code/UI-as-content, single accent, generous spacing, mono-labels.
---

## 1. Language and Branding

- **Fully bilingual:** Hebrew (RTL) in `/he` · English (LTR) in `/en`. Each component is built with a variant for RTL and LTR.
- **Brand name:** `swenlly` (Latin) as the main wordmark; "Swenlly Automations" as the sub-tag in Hebrew.
- **Voice:** Address the audience in the **plural** ("yours", "you have"); talk about ourselves in the **plural** ("we are at swenlly").
- **Assets:** `swenlly_wordmark` (dark version, light text) · `swenlly_leaf` (icon, transparent SVG). Both self-hosted.
---

**Recommendations (exact text extracted from the images):**

1. **גילי מרגי** (Mora Gili · רשת חוגי אנגלית) — ★★★★★
   > תמר אשת מקצוע מאד אמינה, מסורה לעבודה ומקצועית. ממש נהניתי מהשירות שלה והיא עדיין ממשיכה ללוות אותי בכל שאלה והדרכה, ממליצה עליה לקולגות שלי בעסק.

2. **שושי גבאי** (קופירייטרית)
   > תודה על הבוט המדהים, עושה את העבודה ומחמם לידים מקסים. תהליך הבניה נעשה עם המון שיתוף ושירות אדיב ומושלם, שימת לב לפרטים וראש גדול.

3. **חני אייזנבך**(גרפיקאית)
   > היי תמר, חייבת להגיד לך שנהניתי מאוד מהתהליך העבודה איתך על דף האוטומציה. היית קשובה וסבלנית, וביצעת את כל התיקונים שביקשתי (והיו לא מעט...) בסבלנות ובמקצועיות, עד שהגענו לתוצאה המושלמת. אני ממש נהנית מהאוטומציה שבנית לי – היא חוסכת לי המון זמן וכאב ראש מיותר ביומיום. ממליצה בחום לכל מי שרוצה לייעל תהליכים ולעבוד חכם יותר. תמר, את אלופה! תודה על הכל.
---


## 7. Screen Characterization (Wireframe Specification)

> Each screen: hero/intro → body → CTA to establish a conversation. Main RTL.

### 7.1 Home (Home)
1. **Hero:** Back (mono) · H-display ("Let technology work for you.") · sub ("You don't buy a system. You buy peace of mind...") · 2 CTA. On the right of the text, on the other side the Living System visual
2. **Why it's worth moving forward — "Work smart, don't sink":** A value-utility section, **in positive and general terms** (about the value of technology/automation/smart systems — **not** about swenlly, and not "overflowing pain"). Short opening paragraph + 3–4 experienced benefit tiles as a profit/solution:
- **Your time comes back to you** — repetitive tasks run alone, you free yourself up for what really moves.
- **No call goes unanswered** — Every customer is answered and cared for, around the clock.
- **Grow without recruiting** — One system does the work of several.
- **Peace of mind** — Things just happen, without remembering and without chasing.
> Tone: Plural, ambitious and positive. No "you drown / lose / fail". No generic numbers/statistics.
3. **Services (Bento):** 5 cards — AI agents · CRM · Forms · Automations · **Smart systems development** (large umbrella card). **In the language of results** (what to get, not what it is): title, benefit-statement, "←". No generic icons.
4. **How ​​it works:** 4–6 steps (conversation → characterization → proposal → import and construction → implementation and training → support), .
5. **Recommendations:** 3 text cards bound in a uniquely designed container (§5.6 — precise text + profile images). **Carries the social proof of the site**
6. **FAQs:** Breaks down real objections (Price · "Is it suitable for a business of my size?" · Maintenance · "Need technical knowledge?" · Information security).
7. **Final CTA + Newsletter.**

### 7.2 Systems / Services
Short Hero + section for each of the 5 pages: explanation, "Suitable for", dark UI mockup of the system, CTA. Page **Smart Systems Development** is a flagship service: development of customized systems (digital course website, WhatsApp management system, management systems and more — **not just CRM**). Abstract design illustration.*
And below videos and photos of real systems.

### 7.3 Prices (Pricing)
Hero ("Transparent price list") → Blocks from `pricing.html` (AI agents · CRM · forms · automations) each with 1–3 Pricing-Cards and transparent ranges + maintenance. Explanation "What is monthly maintenance". CTA for a consultation call (₪0).
### 7.4 About
A swenlly story in the plural, values, work approach — without portraits. Mockups/abstract graphics.

### 7.5 Contact
Contact form (name, phone, email, message) → Airtable. Details: WhatsApp `+1-478-606-3875` · `info@swenlly.com` · `054-856-8066`. Prominent WhatsApp button.

### 7.6 Making an appointment (Booking)
The original Booking Widget as a full page.

### 7.7 AI Agent
A landing page that explains the agent + the agent itself is active (widget) for a live demo for those interested.
---

## 8. Assets needed (Asset checklist)
- [x] `swenlly_wordmark` (dark)
- [ ] "logo and more" folder with logo files on a transparent background. Black and white in bold
- Font folder with several types of fonts to choose from. Use if appropriate for the site concept.
- [x] Recommendations folder — The recommendations text is **extracted** from the images (`.png`) and appears verbatim in §5.6. The profile images are `.webp/.jpg` files (Mora Gili / Shoshi Gabbay / Hani Eisenbach).
- [x] "Inspirations" folder — **Very important**, should be treated with caution (hierarchy, grids, card formats, colors).
- [x] `pricing.html` — Source of pricing. Please note: **Swenlly should not be presented as just a CRM** — they also develop digital course systems, WhatsApp management, and management systems. The "Development of Smart Systems" block must have equal status (§7.3).
- [ ] Mockups of systems built (CRM, course website, WhatsApp management) — **Future/Optional**; No real examples at the moment, will be added later.
---

