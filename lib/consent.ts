// The visitor's privacy choice, kept in their own browser.
//
// The site sets no advertising, tracking or analytics cookies, so there is
// nothing here to switch off after the fact. The choice is recorded anyway:
// it is what lets us stop asking, and it is what a visitor withdraws when they
// reopen the banner from the footer.

export type Consent = "accepted" | "rejected";

const KEY = "swenlly.privacy-choice";
/** Fired on the window whenever the choice changes, or the banner is reopened. */
export const CONSENT_EVENT = "swenlly:consent";

export function readConsent(): Consent | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw === "accepted" || raw === "rejected" ? raw : null;
  } catch {
    // Private mode, blocked site data — treat as "not asked yet" rather than
    // throwing. The banner reappears; nothing else depends on it.
    return null;
  }
}

export function writeConsent(value: Consent): void {
  try {
    window.localStorage.setItem(KEY, value);
  } catch {
    /* nothing we can do, and nothing that should break the page */
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
}

/** Clears the choice so the banner asks again — used by the footer link. */
export function reopenConsent(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: null }));
}
