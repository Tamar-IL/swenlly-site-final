"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useContent } from "../ContentProvider";
import { CONSENT_EVENT, readConsent, reopenConsent, writeConsent } from "@/lib/consent";

export function CookieBanner() {
  const { content, locale } = useContent();
  const c = content.cookies;
  // Never rendered on the server: the answer lives in the visitor's browser, and
  // guessing it would flash the banner at people who already answered.
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(readConsent() === null);
    const onChange = (e: Event) => setOpen((e as CustomEvent).detail === null);
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_EVENT, onChange);
  }, []);

  if (!open) return null;

  return (
    <div className="cookiebar" role="dialog" aria-label={c.title} aria-live="polite">
      <div className="cookiebar-in">
        <div>
          <div className="cookiebar-t">{c.title}</div>
          <p className="cookiebar-p">
            {c.body}{" "}
            <Link href={`/${locale}/privacy`} className="cookiebar-link">
              {c.policy}
            </Link>
          </p>
        </div>
        <div className="cookiebar-btns">
          <button type="button" className="pill pill-o" onClick={() => writeConsent("rejected")}>
            {c.reject}
          </button>
          <button type="button" className="pill pill-w" onClick={() => writeConsent("accepted")}>
            {c.accept}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Footer link that brings the banner back, so a choice can be withdrawn. */
export function CookiePrefsButton() {
  const { content } = useContent();
  return (
    <button type="button" className="footerlink" onClick={() => reopenConsent()}>
      {content.cookies.reopen}
    </button>
  );
}
