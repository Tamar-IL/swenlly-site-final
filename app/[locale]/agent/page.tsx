import { isLocale, Locale } from "@/lib/i18n";
import { getContent } from "@/lib/content";
import { PageIntro } from "@/components/sections/Bits";
import { AgentChat } from "@/components/AgentChat";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const c = getContent(isLocale(locale) ? locale : "he");
  return { title: c.agent.eyebrow, description: c.agent.lead };
}

export default async function AgentPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc: Locale = isLocale(locale) ? locale : "he";
  const c = getContent(loc);
  const a = c.agent;

  return (
    <div className="wrap">
      <PageIntro eyebrow={a.eyebrow} h1={a.h1} lead={a.lead} />
      <div className="reveal" style={{ marginTop: 24 }}>
        <AgentChat />
      </div>
    </div>
  );
}
