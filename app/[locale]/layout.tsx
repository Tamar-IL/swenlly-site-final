import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "../globals.css";
import { isLocale, dir, locales, Locale } from "@/lib/i18n";
import { getContent } from "@/lib/content";
import { ContentProvider } from "@/components/ContentProvider";
import { RevealInit } from "@/components/RevealInit";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { ChatWidget } from "@/components/widgets/ChatWidget";
import { OrgJsonLd } from "@/components/JsonLd";

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

  return (
    <html lang={locale} dir={dir(locale)}>
      <body>
        <ContentProvider locale={locale} content={content}>
          <Nav locale={locale} content={content} />
          <main>{children}</main>
          <Footer locale={locale} content={content} />
          <ChatWidget />
          <RevealInit />
          <OrgJsonLd />
        </ContentProvider>
      </body>
    </html>
  );
}
