# swenlly — PRD פיתוח (Code)

Development specification document for the Swanley image website. We develop intelligent systems, CRM systems, build automations, and digital forms.
Dark · Bilingual (HE-RTL / EN-LTR) · Static-first

---

## 1. Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | **Next.js (App Router)** | SSG/ISR + server-side route-handlers, i18n, performance. |
| Language | **TypeScript** (strict) | Type-safe. |
| Styling | **Tailwind CSS** + design-tokens (CSS vars) | Fast, consistent, mapped to Figma Variables. |
| Motion | **Framer Motion** | reveal/scroll subdued. |
| Fonts | **next/font/local** | FbEinstein (headers — from client's `font/` folder) · Heebo (body/UI — free OFL). self-hosted, zero FOUT. No paid fonts. |
| Data | **Airtable** (REST API) | Leads, Appointments, Agent Calls. |
| Email | **Resend** | Meeting/Lead Notifications + Newsletter. |
| AI | **OpenAI / Anthropic** Behind the Adapter | Service Agent. |
| Anti-abuse | **Cloudflare Turnstile** | Forms and Agent Protection. |
| Deploy |**Private Server (Docker)** | Cloudflare Domain. |

---

## 2. Layered architecture

```mermaid
flowchart TB
  subgraph Client["Client (Next.js / SSG+ISR)"]
    UI[Pages HE/EN · Components]
    Lead[Lead Form]
    Book[Booking Widget]
    Chat[AI Chat Widget]
  end
  subgraph Edge["Edge / Server (Route Handlers)"]
    A1[/api/lead/]
    A2[/api/booking/]
    A3[/api/agent/]
    MW[Middleware: i18n · rate-limit · Turnstile verify · security headers]
  end
  subgraph Adapters["Server Adapters"]
    LLM[LLM Adapter\nOpenAI | Anthropic]
    AT[Airtable Client]
    RS[Resend Client]
  end
  subgraph External["External"]
    ATB[(Airtable Base)]
    MAIL[(Resend)]
    AIP[(LLM Provider)]
  end
  Lead --> A1 --> AT --> ATB
  A1 --> RS --> MAIL
  Book --> A2 --> AT --> ATB
  A2 --> RS --> MAIL
  Chat --> A3 --> LLM --> AIP
  A3 --> AT --> ATB
  A3 -. booking tool .-> RS
  MW --- A1 & A2 & A3
```

**Client** = תצוגה + לכידת קלט. **Server** = ולידציה, סודות, אינטגרציות. **Adapters** = בידוד ספקים (החלפה קלה).

---

## 3. מבנה פרויקט (מוצע)

```
app/
  [locale]/
    page.tsx                 # בית
    services/page.tsx
    pricing/page.tsx
    about/page.tsx
    contact/page.tsx
    booking/page.tsx
    agent/page.tsx
    privacy/page.tsx         # מדיניות פרטיות (נאסף PII → Airtable)
  api/
    lead/route.ts
    booking/route.ts
    agent/route.ts
components/  (ui/, sections/, widgets/)
lib/
  airtable.ts  resend.ts  llm/ (index.ts, openai.ts, anthropic.ts, prompt.ts, tools.ts)
  validation.ts  rate-limit.ts  turnstile.ts  i18n.ts
content/he.json  content/en.json     # כל הקופי (יסופק/יאושר עם הלקוחה; מחירים מ-pricing.html, המלצות מתיקיית ההמלצות)
public/fonts/  public/icons/  public/brand/
messages/  middleware.ts  tailwind.config.ts
```

---

## 4. i18n

- Paths `/(he|en)` · Default `he`. `dir="rtl"` for he, `ltr` for en (in `<html>`).
- All texts in `content/*.json` — zero hard copy in the code. **Copy source:** will be provided/approved with the client (prices from `pricing.html`; recommendations from the recommendations folder — word for word).
- `hreflang` + canonical for each page in both languages.
---

## 5. מודל נתונים (Airtable)

**Base: `swenlly_site`**

| Table | fields |
|---|---|
| `Leads` | name, phone, email, message, source(page), locale, status(New/Contacted/Won), createdAt |
| `Bookings` | name, phone, email, slot(datetime), topic, status(Pending/Confirmed), locale, createdAt |
| `AgentConversations` | sessionId, locale, transcript(JSON), capturedLead(bool), bookingRequested(bool), createdAt |
| `Newsletter` | email, name, consent(bool), createdAt |

> Status/locale כ-singleSelect. אינדקס לפי createdAt.

---

## 6. API — Route Handlers Contracts

All handlers: `POST`, JSON, validate **Turnstile token**, run **rate-limit** (IP+route), **honeypot** (hidden field), **validation** (zod), and return `{ok:true}` / `{ok:false,error}`.

### 6.1 `POST /api/lead`
in: `{name, phone, email?, message?, source, locale, turnstileToken, hp?}`
Action: Write to `Leads` → Email notification to `info@swenlly.com` (Resend). out: `{ok}`.

### 6.2 `POST /api/booking`
in: `{name, phone, email, slot, topic?, locale, turnstileToken, hp?}`
Action: Check for available slot → Write to `Bookings` (Pending) → **Notify "appointment made"** to email + (op') confirmation to client. out: `{ok, bookingId}`.
*Availability:* List of slots from config/Airtable; prevents double-booking at server level.

### 6.3 `POST /api/agent` (real agent)
in: `{sessionId, messages[], locale, turnstileToken}`
Action: Call LLM-Adapter with system-prompt + tools; Run server-side tool-calls; Save transcript to `AgentConversations`. out: `{reply, actions?}` (stream supported).
---

## 7. AI Agent (Design)

**Purpose:** To serve interested parties who enter the site — answer questions (services/prices), **pick up a lead**, and **set an appointment**.

- **System prompt:** Defines swenlly (5 services — **Includes smart systems development, not just CRM** + price ranges from `pricing.html`), tone plural/professional, boundaries (does not invent prices — gives ranges and refers to characterization), language by `locale`.
- **Tools (function calling), loaded on the server:**
- `capture_lead({name,phone,email?,interest})` → `Leads`.
- `request_booking({name,phone,email,preferred_time})` → `Bookings` + email alert.
- `get_pricing({service})` → ranges from config (single source of truth with the pricing page).
- **Adapter:** `lib/llm/index.ts` exposes `chat(messages, tools)`; implements `openai.ts` / `anthropic.ts`. Provider selection in env (`LLM_PROVIDER`).
- **Controls:** rate-limit per session, limited-connection-length, output filtering, no key exposure, call log to Airtable.

---

## 8. Forms, Validation and Notifications

- **Validation:** zod schema for each endpoint (IL phone, email, field lengths). Bilingual error messages.
- **Resend templates:** `lead-notify`, `booking-notify`, `booking-confirm` (to customer), `newsletter-welcome`. From `no-reply@swenlly.com`, reply-to `info@swenlly.com`.
- **Honeypot + Turnstile** on each form and agent launcher.

---

## 9. Security and Content Protection

| Domain | Means |
|---|---|
| Secrets | Only env on server. No `NEXT_PUBLIC_` for keys. |
| Anti-bot | Cloudflare Turnstile (verify on server) + honeypot. |
| Rate-limit | per IP+route (and also per session for agent). |
| Input | zod validation + sanitization; escape on all output. |
| Headers | Strict CSP (self + only approved origins), `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS. |
| CORS | Closed; API only for the site's origin. |
| Content Protection | Text/mockups only (no 3rd party copyrighted assets); official tool icons fair use.|

---

## 10. Performance, SEO and Accessibility
Genius promotion so that anyone looking for system development, or automation information can go straight to our site

- **Perf:** SSG/ISR · `next/image` (avif/webp, self-host) · self-host fonts (preload, `font-display:swap`) · LCP target < 2.0s, CLS ~0.
- **SEO:** metadata for each page (he/en), `hreflang`, `sitemap.xml`, `robots.txt`, OpenGraph, JSON-LD (`Organization`, `FAQPage`, `Service`).
- **A11y:** Semantics, keyboard navigation, visible focus, `aria` for widgets (chat/booking/accordion), standard contrast, `dir`/`lang` are correct.
---

## 11. Errors, observability, testing

- **Errors:** error boundaries, loading/empty/error states in each widget, friendly retry.
- **Logging:** Server-side logging for route handlers (no sensitive PII); monitoring integration failures (Airtable/Resend/LLM).
- **Testing:** unit for `validation`/`adapters`; integration for route handlers (mock external); e2e (Playwright) for lead/booking/agent flows; a11y testing (axe); RTL/LTR testing.

---
## 12. Deployment

- **Domain:** Cloudflare (DNS + SSL + Turnstile).
- Private server (hetzner) (Docker):** `next build` → Node container behind reverse-proxy (Caddy/Nginx) + TLS. CI from GitHub.
- **Env vars:** `LLM_PROVIDER, OPENAI_API_KEY|ANTHROPIC_API_KEY, AIRTABLE_API_KEY, AIRTABLE_BASE_ID, RESEND_API_KEY, TURNSTILE_SECRET, NEXT_PUBLIC_TURNSTILE_SITEKEY, SITE_URL`.

---

## 13. Recommended Libraries and Docs

| Need | Library | Docs |
|---|---|---|
| Framework | next | nextjs.org/docs |
| Validation | zod | zod.dev |
| Animation | framer-motion | framer.com/motion |
| Fonts | next/font/local | nextjs.org/docs/app/building-your-application/optimizing/fonts |
| Airtable | airtable.js / REST | airtable.com/developers/web/api |
| Email | resend (+react-email) | resend.com/docs · react.email |
| Anti-bot | @marsidev/react-turnstile | developers.cloudflare.com/turnstile |
| LLM | openai / @anthropic-ai/sdk | platform.openai.com/docs · docs.anthropic.com |
| Rate-limit | upstash/ratelimit or in-memory | upstash.com/docs |
| Tests | playwright, vitest, axe-core | playwright.dev · vitest.dev |

---
## 14. Definition of Done
- [ ] Both tracks (he/en) are full, RTL/LTR is working, zero hard copies.
- [ ] Leads+appointments are written to Airtable, emails are sent.
- [ ] Real agent answers, collects leads, and sets appointments (provider-agnostic).
- [ ] Self-hosted fonts/icons (FbEinstein + Heebo, no unnecessary external CDN).
- [ ] Turnstile+rate-limit+honeypot enabled; CSP/headers; secrets on server.
- [ ] Lighthouse: Perf/SEO/A11y/Best-Practices ≥ 95; LCP<2s.
- [ ] Green e2e tests for lead/booking/agent flows.