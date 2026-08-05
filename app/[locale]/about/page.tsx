import { isLocale, Locale } from "@/lib/i18n";
import { getContent } from "@/lib/content";
import { PageIntro, CtaBlock } from "@/components/sections/Bits";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const c = getContent(isLocale(locale) ? locale : "he");
  return { title: c.nav.about, description: c.about.lead };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "he";
  const c = getContent(loc);
  const a = c.about;

  return (
    <div className="wrap">
      <PageIntro eyebrow={a.eyebrow} h1={a.h1} lead={a.lead} />

      <div className="bento reveal" style={{ marginTop: 8 }}>
        <div className="card c-full">
          {a.body.map((p, i) => (
            <p key={i} style={{ fontSize: 16, lineHeight: 1.8, color: "var(--tx2)", marginBottom: i < a.body.length - 1 ? 16 : 0 }}>
              {p}
            </p>
          ))}
        </div>
      </div>

      <div className="slab">
        <span className="t">איך אנחנו עובדים</span>
      </div>
      <div className="bento reveal">
        {a.values.map((v) => (
          <div className="card c-third hoverable" key={v.t}>
            <div className="ttl">{v.t}</div>
            <p className="sub" style={{ fontSize: 14.5, color: "var(--tx2)", marginTop: 10, lineHeight: 1.7 }}>
              {v.p}
            </p>
          </div>
        ))}
      </div>

      <CtaBlock cta={a.cta} href={`/${loc}/contact`} />
    </div>
  );
}
