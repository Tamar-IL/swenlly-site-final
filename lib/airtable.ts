// Airtable adapter. Uses the REST API directly (no SDK dependency at runtime).
// Gracefully no-ops (logs) when credentials are absent so the site works without a backend.

const API = "https://api.airtable.com/v0";

function config() {
  const key = process.env.AIRTABLE_API_KEY;
  const base = process.env.AIRTABLE_BASE_ID;
  if (!key || !base) return null;
  return { key, base };
}

export function airtableConfigured(): boolean {
  return config() !== null;
}

export async function createRecord(
  table: string,
  fields: Record<string, unknown>
): Promise<{ ok: boolean; id?: string; skipped?: boolean }> {
  const cfg = config();
  if (!cfg) {
    // Not an error: Airtable is optional, and leads are delivered by email when
    // it is unset. Deliberately does not log `fields` — that is a visitor's name,
    // phone and email, and it does not belong in container logs on every submit.
    return { ok: false, skipped: true };
  }
  try {
    const res = await fetch(`${API}/${cfg.base}/${encodeURIComponent(table)}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields, typecast: true }),
    });
    if (!res.ok) {
      console.error(`[airtable] ${table} write failed`, res.status, await res.text());
      return { ok: false };
    }
    const data = (await res.json()) as { id: string };
    return { ok: true, id: data.id };
  } catch (err) {
    console.error(`[airtable] ${table} write error`, err);
    return { ok: false };
  }
}
