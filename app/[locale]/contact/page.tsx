import { isLocale, Locale } from "@/lib/i18n";
import { getContent } from "@/lib/content";
import { PageIntro } from "@/components/sections/Bits";
import { LeadForm } from "@/components/LeadForm";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const c = getContent(isLocale(locale) ? locale : "he");
  return { title: c.nav.contact, description: c.contact.lead };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "he";
  const c = getContent(loc);
  const ct = c.contact;
  const d = ct.details;

  return (
    <div className="wrap">
      <PageIntro eyebrow={ct.eyebrow} h1={ct.h1} lead={ct.lead} />

      <div className="svc reveal" style={{ marginTop: 24 }}>
        <div className="card">
          <LeadForm />
        </div>

        <div className="card hoverable">
          <div className="ttl">{ct.eyebrow}</div>
          <div style={{ marginTop: 18 }}>
            <div className="crow">
              <span className="k">{d.whatsappLabel}</span>
              <a className="v lat" href="https://wa.me/14786063875" target="_blank" rel="noopener noreferrer">
                {d.whatsapp}
              </a>
            </div>
            <div className="crow">
              <span className="k">{d.emailLabel}</span>
              <a className="v lat" href={`mailto:${d.email}`}>{d.email}</a>
            </div>
            <div className="crow">
              <span className="k">{d.phoneLabel}</span>
              <a className="v lat" href="tel:0548568066">{d.phone}</a>
            </div>
          </div>
          <a className="pill pill-w" href="https://wa.me/14786063875" target="_blank" rel="noopener noreferrer" style={{ marginTop: 22 }}>
            {ct.whatsappBtn}
          </a>
        </div>
      </div>
    </div>
  );
}
