export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function OrgJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "swenlly",
        alternateName: "סוונלי אוטומציות",
        url: "https://swenlly.com",
        email: "info@swenlly.com",
        description:
          "פיתוח מערכות חכמות, סוכני AI, אוטומציות וטפסים דיגיטליים לעסקים.",
        sameAs: [],
        contactPoint: {
          "@type": "ContactPoint",
          telephone: "+972-54-856-8066",
          contactType: "sales",
          availableLanguage: ["he", "en"],
        },
      }}
    />
  );
}
