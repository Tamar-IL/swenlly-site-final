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
      <body>{children}</body>
    </html>
  );
}
