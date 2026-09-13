import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "../globals.css";
import { isLocale, dir, locales, Locale } from "@/lib/i18n";
import { getContent } from "@/lib/content";
import { ContentProvider } from "@/components/ContentProvider";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { ChatWidget } from "@/components/widgets/ChatWidget";
import { OrgJsonLd } from "@/components/JsonLd";

const REVEAL_SCRIPT = "(function(){try{var d=document,r=d.documentElement;if(!('IntersectionObserver' in window))return;r.className+=' js-reveal';var done=function(){var n=d.querySelectorAll('.reveal:not(.in)');for(var i=0;i<n.length;i++)n[i].classList.add('in');};var start=function(){try{var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{threshold:.08});var n=d.querySelectorAll('.reveal');for(var i=0;i<n.length;i++)io.observe(n[i]);}catch(e){done();}};if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',start);else start();setTimeout(done,3000);}catch(e){}})();";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "he";
  const c = getContent(loc);
  return {
    metadataBase: new URL("https://swenlly.com"),
    title: { default: c.meta.titleDefault, template: c.meta.titleTemplate },
    description: c.meta.description,
    alternates: {
      canonical: `/${loc}`,
      languages: { he: "/he", en: "/en" },
    },
    openGraph: {
      type: "website",
      siteName: "swenlly",
      title: c.meta.titleDefault,
      description: c.meta.description,
      locale: loc === "he" ? "he_IL" : "en_US",
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const content = getContent(locale);

  // Preload only the subsets this locale paints first: the display face and the
  // text face for its own script. Everything else loads on demand via unicode-range.
  const script = locale === "he" ? "hebrew" : "latin";

  return (
    <html lang={locale} dir={dir(locale)}>
      <head>
        {/* Reveal-on-scroll is wired up here, inline, rather than in a React
            effect: this runs the moment the HTML is parsed, so content appears
            without waiting on the JS bundle to download and hydrate. It only
            hides anything once it knows it can reveal it again, and a 3s
            failsafe guarantees nothing stays invisible. */}
        <script dangerouslySetInnerHTML={{ __html: REVEAL_SCRIPT }} />
        <link
          rel="preload"
          href={`/fonts/rubik-${script}.woff2`}
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href={`/fonts/assistant-${script}.woff2`}
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <ContentProvider locale={locale} content={content}>
          <Nav locale={locale} content={content} />
          <main>{children}</main>
          <Footer locale={locale} content={content} />
          <ChatWidget />
          <OrgJsonLd />
        </ContentProvider>
      </body>
    </html>
  );
}
