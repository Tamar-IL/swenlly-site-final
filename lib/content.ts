import he from "@/content/he.json";
import en from "@/content/en.json";
import { Locale } from "./i18n";

type Json = Record<string, unknown>;

/** Deep-merge overlay onto base (base = Hebrew source of truth). */
function merge<T extends Json>(base: T, overlay: Json): T {
  const out: Json = Array.isArray(base) ? [...(base as unknown[])] as unknown as Json : { ...base };
  for (const key of Object.keys(overlay)) {
    const b = (out as Json)[key];
    const o = overlay[key];
    if (o && typeof o === "object" && !Array.isArray(o) && b && typeof b === "object" && !Array.isArray(b)) {
      (out as Json)[key] = merge(b as Json, o as Json);
    } else {
      (out as Json)[key] = o;
    }
  }
  return out as T;
}

export type Content = typeof he;

/**
 * Hebrew is the source of truth. English overlays only where translated;
 * missing English keys fall back to Hebrew so /en always renders.
 */
export function getContent(locale: Locale): Content {
  if (locale === "he") return he;
  return merge(he, en as Json);
}
