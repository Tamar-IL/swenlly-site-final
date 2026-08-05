"use client";

import { createContext, useContext } from "react";
import type { Content } from "@/lib/content";
import type { Locale } from "@/lib/i18n";

type Ctx = { locale: Locale; content: Content };
const ContentContext = createContext<Ctx | null>(null);

export function ContentProvider({
  locale,
  content,
  children,
}: Ctx & { children: React.ReactNode }) {
  return (
    <ContentContext.Provider value={{ locale, content }}>
      {children}
    </ContentContext.Provider>
  );
}

export function useContent(): Ctx {
  const ctx = useContext(ContentContext);
  if (!ctx) throw new Error("useContent must be used within ContentProvider");
  return ctx;
}
