"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Content } from "@/lib/content";
import type { Locale } from "@/lib/i18n";

export function Nav({ locale, content }: { locale: Locale; content: Content }) {
  const pathname = usePathname();
  const base = `/${locale}`;
  const links = [
    { href: `${base}/services`, label: content.nav.services },
    { href: `${base}/about`, label: content.nav.about },
    { href: `${base}/pricing`, label: content.nav.pricing },
    { href: `${base}/contact`, label: content.nav.contact },
  ];
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="nav">
      <div className="nav-in">
        <Link className="mark" href={base} aria-label="swenlly">
          <img src="/brand/swenlly-wordmark-white.webp" alt="סוונלי" className="nav-logo" />
        </Link>
        <nav className="nlinks">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={isActive(l.href) ? "active" : ""}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="nav-r">
          <Link className="pill pill-nav" href={`${base}/contact`}>
            {content.nav.cta}
          </Link>
        </div>
      </div>
    </header>
  );
}
