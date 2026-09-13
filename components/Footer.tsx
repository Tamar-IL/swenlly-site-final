import Link from "next/link";
import type { Content } from "@/lib/content";
import type { Locale } from "@/lib/i18n";

export function Footer({ locale, content }: { locale: Locale; content: Content }) {
  const base = `/${locale}`;
  const c = content.contact.details;
  return (
    <footer>
      <div className="wrap">
        <div className="fg">
          <div>
            <img src="/brand/swenlly-wordmark-white.webp" alt="סוונלי" className="footer-logo" />
            <div className="fcol" style={{ marginTop: 10 }}>
              {content.brand.sub}
            </div>
          </div>

          <div className="fcol">
            <div className="mono" style={{ fontSize: 11, letterSpacing: ".07em", marginBottom: 6, color: "var(--tx4)" }}>
              {content.footer.contactHead}
            </div>
            <a href="https://wa.me/14786063875" target="_blank" rel="noopener noreferrer">
              WhatsApp · {c.whatsapp}
            </a>
            <br />
            <a href={`mailto:${c.email}`}>{c.email}</a>
            <br />
            <a href="tel:0548568066">{c.phone}</a>
          </div>

          <nav className="fcol">
            <div className="mono" style={{ fontSize: 11, letterSpacing: ".07em", marginBottom: 6, color: "var(--tx4)" }}>
              {content.footer.navHead}
            </div>
            <Link href={`${base}/services`}>{content.nav.services}</Link>
            <br />
            <Link href={`${base}/pricing`}>{content.nav.pricing}</Link>
            <br />
            <Link href={`${base}/about`}>{content.nav.about}</Link>
            <br />
            <Link href={`${base}/contact`}>{content.nav.contact}</Link>
          </nav>
        </div>

        <div className="fb">
          <span>{content.footer.rights}</span>
          <span className="lat mono">{content.footer.lat}</span>
        </div>
      </div>
    </footer>
  );
}
