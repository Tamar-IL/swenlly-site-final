import { getContent } from "@/lib/content";
import { ContentProvider } from "@/components/ContentProvider";
import { LeadForm } from "@/components/LeadForm";

export default function SoonPage() {
  const c = getContent("he");
  const s = c.soon;
  const d = c.contact.details;

  return (
    <ContentProvider locale="he" content={c}>
      <main className="soon">
        <div className="soon-in">
          <header className="soon-head">
            <img src="/brand/swenlly-wordmark-white.webp" alt="סוונלי" className="soon-logo" />
            <span className="soon-badge">
              <i className="soon-dot" aria-hidden="true" />
              {s.badge}
            </span>
          </header>

          <p className="soon-eyebrow mono">{s.eyebrow}</p>
          <h1 className="soon-h1">{s.h1}</h1>
          <p className="soon-lead">{s.lead}</p>

          <div className="soon-grid">
            <section className="card">
              <div className="ttl">{s.contactHead}</div>
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
              <a
                className="pill pill-w"
                href="https://wa.me/14786063875"
                target="_blank"
                rel="noopener noreferrer"
                style={{ marginTop: 22 }}
              >
                {c.contact.whatsappBtn}
              </a>
            </section>

            <section className="card">
              <div className="ttl">{s.formHead}</div>
              <div style={{ marginTop: 6 }}>
                <LeadForm />
              </div>
            </section>
          </div>

          <p className="soon-foot lat">{c.footer.lat}</p>
        </div>
      </main>
    </ContentProvider>
  );
}
