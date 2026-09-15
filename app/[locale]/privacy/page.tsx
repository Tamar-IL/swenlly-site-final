import { isLocale, Locale } from "@/lib/i18n";
import { getContent } from "@/lib/content";
import { PageIntro } from "@/components/sections/Bits";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const c = getContent(isLocale(locale) ? locale : "he");
  return { title: c.privacy.eyebrow, description: c.privacy.lead };
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "he";
  const c = getContent(loc);
  const p = c.privacy;

  return (
    <div className="wrap">
      <PageIntro eyebrow={p.eyebrow} h1={p.h1} lead={p.lead} />
      <div className="bento reveal" style={{ marginTop: 8 }}>
        <div className="card c-full">
          <p className="mono" style={{ fontSize: 11.5, color: "var(--tx4)", letterSpacing: ".04em" }}>{p.updated}</p>
          {p.sections.map((s, i) => (
            <div key={s.t} style={{ paddingBlock: 18, borderBottom: i < p.sections.length - 1 ? "1px solid var(--line)" : "none" }}>
              <div className="ttl" style={{ fontSize: 17 }}>{s.t}</div>
              <p style={{ fontSize: 14.5, color: "var(--tx2)", lineHeight: 1.75, marginTop: 8 }}>{s.p}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
