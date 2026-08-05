import type { MetadataRoute } from "next";
import { locales } from "@/lib/i18n";

const BASE = "https://swenlly.com";
const PATHS = ["", "/services", "/pricing", "/about", "/contact", "/booking", "/agent", "/privacy"];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];
  for (const locale of locales) {
    for (const path of PATHS) {
      entries.push({
        url: `${BASE}/${locale}${path}`,
        lastModified: new Date(),
        changeFrequency: path === "" ? "weekly" : "monthly",
        priority: path === "" ? 1 : 0.7,
        alternates: {
          languages: Object.fromEntries(locales.map((l) => [l, `${BASE}/${l}${path}`])),
        },
      });
    }
  }
  return entries;
}
