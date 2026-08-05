import Link from "next/link";
import { isLocale, Locale } from "@/lib/i18n";
import { getContent } from "@/lib/content";
import { PageIntro, CtaBlock } from "@/components/sections/Bits";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const c = getContent(isLocale(locale) ? locale : "he");
  return { title: c.nav.pricing, description: c.pricing.lead };
}

type Card = {
  name: string;
  tagline: string;
  from: string;
  range?: string;
  monthly?: string;
  featured?: boolean;
  muted?: string;
  feats: string[];
};

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "he";
  const c = getContent(loc);
  const p = c.pricing;
  const base = `/${loc}`;

  return (
    <div className="wrap">
      <div className="pintro reveal">
        <h1>{p.h1}</h1>
        <p className="lead">{p.lead}</p>
        <div className="hcta" style={{ marginTop: 26 }}>
          <Link className="pill pill-w" href={`${base}/contact`}>
            {p.primary}
          </Link>
        </div>
      </div>

      {p.blocks.map((block) => {
        const cards = block.cards as Card[];
        const cardsPerGroup = 3;
        const groups = [];
        for (let i = 0; i < cards.length; i += cardsPerGroup) {
          groups.push(cards.slice(i, i + cardsPerGroup));
        }
        return (
          <section key={block.id} id={block.id}>
            <div className="slab">
              <span className="t">{block.h2}</span>
              <span className="s mono">{block.label}</span>
            </div>
            <p className="lead" style={{ maxWidth: "60ch", marginBottom: 20 }}>
              {block.p}
            </p>
            {groups.map((group, groupIdx) => (
              <div className="region reveal" key={groupIdx} style={{ marginBottom: 16 }}>
                <div className="bento">
                  {group.map((card) => (
                    <div
                      className={`card c-third hoverable${card.featured ? " featured" : ""}`}
                      key={card.name}
                    >
                      {card.featured && <span className="featured-mark">הכי פופולרי</span>}
                      <div className="ttl">{card.name}</div>
                      {card.muted && (
                        <div className="klabel" style={{ marginTop: 6 }}>
                          {card.muted}
                        </div>
                      )}
                      <p className="sub" style={{ fontSize: 14, marginTop: 10, color: "var(--tx2)" }}>
                        {card.tagline}
                      </p>
                      <div className="priceline">
                        <div>
                          <span className="from">החל מ־</span>
                          <span className="amtbig">{card.from}</span>
                          {card.range && <span className="rng">טווח: {card.range}</span>}
                        </div>
                      </div>
                      {card.feats.length > 0 && (
                        <ul className="plist">
                          {card.feats.map((f) => (
                            <li key={f}>
                              <span className="ar">→</span>
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {card.monthly && (
                        <div className="mo">
                          תחזוקה חודשית <b>{card.monthly}</b>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        );
      })}

      <div className="explain-note reveal" style={{ marginTop: 44 }}>
        <p>{p.maintenanceNote}</p>
      </div>

      <CtaBlock cta={p.cta} href={`${base}/contact`} />
    </div>
  );
}
