import type { Metadata } from "next";
import { Rubik, Heebo } from "next/font/google";
import "../globals.css";

const display = Rubik({ subsets: ["hebrew", "latin"], weight: ["700"], display: "swap", variable: "--swl-display" });
const sans = Heebo({ subsets: ["hebrew", "latin"], weight: ["400", "600", "700"], display: "swap", variable: "--swl-body" });

export const metadata: Metadata = {
  metadataBase: new URL("https://swenlly.com"),
  title: "swenlly · סוונלי אוטומציות",
  description: "האתר בבנייה. אפשר להשאיר הודעה, ונחזור אליך.",
  // Keep the placeholder out of search results — the real site should be what gets indexed.
  robots: { index: false, follow: false },
};

export default function SoonLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={`${display.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
