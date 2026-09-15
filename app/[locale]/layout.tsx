import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "../globals.css";
import { isLocale, dir, locales, Locale } from "@/lib/i18n";
import { getContent } from "@/lib/content";
import { ContentProvider } from "@/components/ContentProvider";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { ChatWidget } from "@/components/widgets/ChatWidget";
import { CookieBanner } from "@/components/widgets/CookieBanner";
import { OrgJsonLd } from "@/components/JsonLd";

const REVEAL_SCRIPT = "(function(){try{var d=document,e=d.querySelectorAll('.reveal');if(!e.length||!('IntersectionObserver' in window))return;var vh=window.innerHeight||d.documentElement.clientHeight,b=[],i,el;for(i=0;i<e.length;i++){el=e[i];if(el.getBoundingClientRect().top>vh*0.9){el.className+=' pending';b.push(el);}}if(!b.length)return;var io=new IntersectionObserver(function(es){es.forEach(function(x){if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target);}});},{threshold:.08});for(i=0;i<b.length;i++)io.observe(b[i]);setTimeout(function(){for(var j=0;j<b.length;j++)b[j].classList.add('in');},4000);}catch(x){}})();";

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
          <CookieBanner />
          <OrgJsonLd />
        </ContentProvider>
        {/* Last thing in the body, so the DOM above is already parsed. It hides
            only what is below the fold and animates that in on scroll; anything
            on screen was never hidden and needed no JS to appear. */}
        <script dangerouslySetInnerHTML={{ __html: REVEAL_SCRIPT }} />
      </body>
    </html>
  );
}
