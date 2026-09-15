import { isLocale, Locale } from "@/lib/i18n";
import { getContent } from "@/lib/content";
import { PageIntro } from "@/components/sections/Bits";
import { ManageBooking } from "@/components/ManageBooking";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const c = getContent(isLocale(locale) ? locale : "he");
  return {
    title: c.booking.manage.eyebrow,
    description: c.booking.manage.lead,
    // A manage link is personal. It must never end up in an index.
    robots: { index: false, follow: false },
  };
}

export default async function ManageBookingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "he";
  const m = getContent(loc).booking.manage;

  return (
    <div className="wrap">
      <PageIntro eyebrow={m.eyebrow} h1={m.h1} lead={m.lead} />
      <div className="bento reveal" style={{ marginTop: 20 }}>
        <div className="card c-full" style={{ maxWidth: 620, margin: "0 auto", width: "100%" }}>
          <ManageBooking />
        </div>
      </div>
    </div>
  );
}
