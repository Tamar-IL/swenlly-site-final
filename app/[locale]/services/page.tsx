import { isLocale, Locale } from "@/lib/i18n";
import { getContent } from "@/lib/content";
import { PageIntro, CtaBlock } from "@/components/sections/Bits";
import { ServiceMock } from "@/components/ui/ProductUI";
import { JsonLd } from "@/components/JsonLd";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const c = getContent(isLocale(locale) ? locale : "he");
  return { title: c.nav.services, description: c.services.lead };
}

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "he";
  const c = getContent(loc);
  const s = c.services;
  const base = `/${loc}`;

  /* display order — סוכני AI moves ahead of טפסים and אוטומציות */
  const ORDER = ["systems", "crm", "agents", "forms", "automations"];
  const rank = (id: string) => {
    const i = ORDER.indexOf(id);
    return i === -1 ? ORDER.length : i;
  };
  const items = [...s.items].sort((a, b) => rank(a.id) - rank(b.id));

  return (
    <div className="wrap">
      <PageIntro h1={s.h1} lead={s.lead} />

      {items.map((item, i) => {
        /* the pricing blocks carry the real per-service breakdown — reuse it as the explanation */
        const tiers = c.pricing.blocks.find((b) => b.id === item.id)?.cards ?? [];
        return (
          <section className="reveal svcunit" id={item.id} key={item.id}>
            <span className="ghostno" aria-hidden="true">
              {String(i + 1).padStart(2, "0")}
            </span>

            <div className="svchead">
              {item.flagship && <span className="flag">שירות הדגל</span>}
              <h2>{item.title}</h2>
              <p className="intro">{item.p}</p>
            </div>

            <div className="svcbody">
              <div>
                <div className="svclabel">מתאים ל־</div>
                <div className="svcfit">
                  {item.fit.map((f) => (
                    <span key={f}>{f}</span>
                  ))}
                </div>
              </div>
              <ServiceMock type={item.mock} />
            </div>

            {/* real client build — the flagship service shows an actual system we delivered */}
            {item.id === "systems" && (
              <div className="svcwhat">
                <div className="svclabel">מוצר שבנינו ללקוח</div>
                {/* preload="none": the page shows the poster and fetches no video
                    bytes at all until the visitor actually presses play. */}
                <video
                  className="svcvideo"
                  src="/media/portfolio-systems-16x9.mp4"
                  poster="/media/portfolio-poster.jpg"
                  controls
                  playsInline
                  muted
                  loop
                  preload="none"
                />
              </div>
            )}

            {/* CRM shows real screenshots of a system we delivered, the same way
                the flagship shows its video. Client columns are blurred in the
                source, and the client-list shot is cropped above the row that
                held a name and a phone number. */}
            {item.id === "crm" && (
              <div className="svcwhat">
                <div className="svclabel">{s.crmShots.label}</div>
                <div className="shotgrid">
                  {s.crmShots.items.map((shot, i) => (
                    <figure className={`shot${i === 0 ? " wide" : ""}`} key={shot.src}>
                      {/* Caption first: it says what to look at, which is only
                          useful before the eye lands on the screenshot. */}
                      <figcaption>
                        <span className="shot-c">{shot.cap}</span>
                        <span className="shot-s">{shot.sub}</span>
                      </figcaption>
                      <img
                        src={shot.src}
                        alt={shot.cap}
                        loading="lazy"
                        decoding="async"
                      />
                    </figure>
                  ))}
                </div>
              </div>
            )}

            {tiers.length > 0 && (
              <div className="svcwhat">
                <div className="svclabel">מה זה כולל</div>
                <div className="svctiers">
                  {tiers.map((t) => (
                    <div className="svctier" key={t.name}>
                      <div className="tn">{t.name}</div>
                      <p>{t.tagline}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        );
      })}

      <div className="explain-note reveal" style={{ marginTop: 40 }}>
        <p>{s.note}</p>
      </div>

      <CtaBlock cta={s.cta} href={`${base}/booking`} />

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          itemListElement: items.map((item, i) => ({
            "@type": "Service",
            position: i + 1,
            name: item.title,
            description: item.p,
            provider: { "@type": "Organization", name: "swenlly" },
          })),
        }}
      />
    </div>
  );
}
