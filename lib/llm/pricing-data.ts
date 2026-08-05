// Single source of truth for price ranges the agent may quote.
// Kept in sync with the pricing page content (content/he.json → pricing).

export const PRICING: Record<string, { label: string; range: string; monthly: string }> = {
  agents: { label: "סוכני AI", range: "₪4,500 – ₪14,000+", monthly: "₪150–500 / חודש" },
  crm: { label: "מערכות CRM", range: "₪5,000 – ₪22,000+", monthly: "₪100–500 / חודש" },
  forms: { label: "טפסים דיגיטליים", range: "₪400 – ₪2,800", monthly: "₪0–200 / חודש" },
  automations: { label: "אוטומציות", range: "₪500 – ₪7,000", monthly: "₪0–400 / חודש" },
  systems: { label: "פיתוח מערכות חכמות", range: "מותאם אישית — לפי אפיון", monthly: "לפי היקף" },
};

export const PRICING_SUMMARY = Object.values(PRICING)
  .map((p) => `- ${p.label}: ${p.range} (תחזוקה ${p.monthly}).`)
  .join("\n");

export function getPricing(service?: string): { label: string; range: string; monthly: string } | typeof PRICING {
  if (service && PRICING[service]) return PRICING[service];
  return PRICING;
}
