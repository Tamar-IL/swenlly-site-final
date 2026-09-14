import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://swenlly.com"),
  title: "swenlly · סוונלי אוטומציות",
  description: "האתר בבנייה. השאירו הודעה ונחזור אליכם.",
  // Keep the placeholder out of search results — the real site should be what gets indexed.
  robots: { index: false, follow: false },
};

export default function SoonLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="preload" href="/fonts/rubik-hebrew.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/assistant-hebrew.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
