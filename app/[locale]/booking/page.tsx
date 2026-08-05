import { isLocale, Locale } from "@/lib/i18n";
import { getContent } from "@/lib/content";
import { PageIntro } from "@/components/sections/Bits";
import { BookingForm } from "@/components/BookingForm";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const c = getContent(isLocale(locale) ? locale : "he");
  return { title: c.booking.eyebrow, description: c.booking.lead };
}

export default async function BookingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "he";
  const c = getContent(loc);
  const b = c.booking;

  return (
    <div className="wrap">
      <PageIntro eyebrow={b.eyebrow} h1={b.h1} lead={b.lead} />
      <div className="bento reveal" style={{ marginTop: 20 }}>
        <div className="card c-full" style={{ maxWidth: 620, margin: "0 auto", width: "100%" }}>
          <BookingForm />
        </div>
      </div>
    </div>
  );
}
