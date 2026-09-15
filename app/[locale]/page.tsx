import Link from "next/link";
import { isLocale, Locale } from "@/lib/i18n";
import { getContent } from "@/lib/content";
import { LeadsChartCard, AutomationRuleCard, SystemsBuiltCard } from "@/components/ui/ProductUI";
import { Testimonials } from "@/components/sections/Testimonials";
import { NewsletterForm } from "@/components/NewsletterForm";
import { JsonLd } from "@/components/JsonLd";
import { HeroDotsCard } from "@/components/HeroDotsCard";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "he";
  const c = getContent(loc);
  const h = c.home;
  const base = `/${loc}`;

  return (
    <div className="wrap">
      {/* HERO TITLE — tagline section */}
      <div className="first reveal" style={{ position: "relative", marginTop: 48, textAlign: "center", marginBottom: 56, padding: "72px 40px" }}>
        {/* brand mark sits behind the tagline as a watermark */}
        <img
          src="/brand/swenlly-icon-automation.webp"
          alt=""
          aria-hidden="true"
          style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", height: "clamp(220px, 26vw, 340px)", width: "auto", opacity: 0.18, pointerEvents: "none", userSelect: "none" }}
        />
        <p style={{ position: "relative", fontSize: "clamp(36px, 4.6vw, 56px)", lineHeight: 1.45, color: "var(--tx)", fontWeight: 700, fontFamily: "var(--disp)", maxWidth: "52ch", margin: "0 auto", letterSpacing: "-0.02em" }}>
          סוונלי .<br />
          מערכות חכמות, מערכות CRM, <br />
          אוטומציות וטפסים. <br />
          <span style={{ fontSize: "0.5em", color: "var(--tx3)", display: "inline-block", marginTop: 18, lineHeight: 1.6 }}>הכל בהתאמה אישית.</span>
        </p>
      </div>

      {/* HERO CARDS — large card and three-box grid in same row */}
      <div className="reveal" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20, marginBottom: 40 }}>
        <HeroDotsCard className="card hero-dots-bg" style={{ padding: "40px 32px" }}>
          <h1 style={{ marginBottom: 20 }}>{h.hero.h1}</h1>
          <p className="lead" style={{ marginBottom: 24 }}>{h.hero.lead}</p>
          <div className="hcta">
            <Link className="pill pill-w" href={`${base}/booking`}>
              {h.hero.ctaPrimary}
            </Link>
            <Link className="pill pill-o" href={`${base}/services`}>
              {h.hero.ctaSecondary}
            </Link>
          </div>
        </HeroDotsCard>
        <div className="region" style={{ padding: 18 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { title: "פיתוח מערכות חכמות", desc: "בהזמנה" },
              { title: "בנייה ומערכות CRM", desc: "ניהול לקוחות" },
              { title: "טפסים דיגיטליים חכמים", desc: "ללא נייר" },
              { title: "אוטומציות מתקדמות", desc: "תהליכים לבד" }
            ].map((svc, i) => (
              <div key={i} style={{ background: "var(--card2)", border: "1px solid var(--line)", borderRadius: 11, padding: 16 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--tx)", marginBottom: 3 }}>{svc.title}</div>
                <div style={{ fontSize: 11.5, color: "var(--tx3)" }}>{svc.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* WORK — approved showcase trio inside a region panel */}
      <div className="slab" id="work">
        <span className="t">{h.work.t}</span>
        <span className="s">{h.work.s}</span>
      </div>
      <div className="region reveal">
        <div className="bento">
          <LeadsChartCard content={c} />
          <AutomationRuleCard content={c} />
          <SystemsBuiltCard content={c} />
        </div>
      </div>

      {/* HOW */}
      <div className="slab" id="how">
        <span className="t">{h.how.t}</span>
        <span className="s">{h.how.s}</span>
      </div>
      <div className="bento reveal">
        <div className="card c-full">
          <div className="psteps">
            {h.how.steps.map((s) => (
              <div className="pstep" key={s.h}>
                <h4>{s.h}</h4>
                <p>{s.p}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TESTIMONIALS */}
      <div className="slab" id="quotes">
        <span className="t">{h.quotes.t}</span>
        <span className="s">{h.quotes.s}</span>
      </div>
      <div className="reveal">
        <Testimonials />
      </div>

      {/* FAQ */}
      <div className="slab" id="faq">
        <span className="t">{h.faq.t}</span>
        <span className="s">{h.faq.s}</span>
      </div>
      <div className="bento reveal">
        <div className="card c-full faqcard">
          {h.faq.items.map((it, i) => (
            <details key={it.q} open={i === 0}>
              <summary>
                {it.q}
                <span className="pm">+</span>
              </summary>
              <div className="a">{it.a}</div>
            </details>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="ctasection reveal" id="cta">
        <h2>{h.cta.h2}</h2>
        <p>{h.cta.p}</p>
        <div className="ctarow">
          <Link className="pill pill-w" href={`${base}/booking`}>
            {h.cta.primary}
          </Link>
          <NewsletterForm />
        </div>
      </div>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: h.faq.items.map((it) => ({
            "@type": "Question",
            name: it.q,
            acceptedAnswer: { "@type": "Answer", text: it.a },
          })),
        }}
      />
    </div>
  );
}
