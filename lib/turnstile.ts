// Cloudflare Turnstile verification. If no secret is configured, we skip
// verification (dev / graceful degradation) and log a warning.

export async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET;
  if (!secret) {
    console.warn("[turnstile] TURNSTILE_SECRET not set — skipping verification");
    return true;
  }
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
    });
    const data = (await res.json()) as { success: boolean };
    return data.success === true;
  } catch (err) {
    console.error("[turnstile] verification failed", err);
    return false;
  }
}
