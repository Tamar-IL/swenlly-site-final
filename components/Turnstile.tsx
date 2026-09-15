"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* Cloudflare's script attaches itself to window once loaded. */
type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  remove: (id: string) => void;
  reset: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
    onloadTurnstileCallback?: () => void;
  }
}

const SCRIPT_ID = "cf-turnstile-script";
const SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onloadTurnstileCallback";

/** Resolves once the Turnstile API is on window. Shared, so two forms on one
 *  page do not each inject the script. */
function loadTurnstile(): Promise<TurnstileApi> {
  if (typeof window === "undefined") return new Promise(() => {});
  if (window.turnstile) return Promise.resolve(window.turnstile);

  return new Promise((resolve, reject) => {
    const done = () => window.turnstile && resolve(window.turnstile);
    const prev = window.onloadTurnstileCallback;
    window.onloadTurnstileCallback = () => {
      prev?.();
      done();
    };
    if (document.getElementById(SCRIPT_ID)) return; // already loading
    const s = document.createElement("script");
    s.id = SCRIPT_ID;
    s.src = SRC;
    s.async = true;
    s.defer = true;
    s.onerror = () => reject(new Error("turnstile script failed to load"));
    document.head.appendChild(s);
  });
}

export type TurnstileHandle = { reset: () => void };

/**
 * Renders the Turnstile checkbox and hands the token up via onToken.
 *
 * Renders nothing when NEXT_PUBLIC_TURNSTILE_SITEKEY is unset, so the forms
 * keep working in development and on a build made before the key existed —
 * the server skips verification in exactly the same case.
 *
 * NOTE: the site key is inlined at BUILD time, not read at runtime. Adding it
 * to .env requires a rebuild (./scripts/deploy.sh), not just a container
 * recreate.
 */
export function Turnstile({
  onToken,
  locale,
  onReady,
}: {
  onToken: (token: string | null) => void;
  locale: string;
  onReady?: (handle: TurnstileHandle) => void;
}) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITEKEY;
  const boxRef = useRef<HTMLDivElement | null>(null);
  const widgetId = useRef<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  // Kept in refs so the mount effect does not re-run when a parent re-renders
  // and hands us a new function identity — that would tear down the widget.
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  const reset = useCallback(() => {
    if (widgetId.current && window.turnstile) {
      window.turnstile.reset(widgetId.current);
      onTokenRef.current(null);
    }
  }, []);

  useEffect(() => {
    if (!siteKey || !boxRef.current) return;
    let cancelled = false;

    loadTurnstile()
      .then((api) => {
        if (cancelled || !boxRef.current || widgetId.current) return;
        widgetId.current = api.render(boxRef.current, {
          sitekey: siteKey,
          theme: "dark",
          language: locale === "en" ? "en" : "he",
          callback: (token: string) => onTokenRef.current(token),
          // A token is single-use and expires; clear it so a stale one is never sent.
          "expired-callback": () => onTokenRef.current(null),
          // Cloudflare passes a numeric code here and it is the only signal
          // that says WHY. 110200 = this domain is not on the sitekey's allowed
          // list, which is the usual cause on a freshly pointed domain.
          "error-callback": (code?: string) => {
            onTokenRef.current(null);
            console.error("[turnstile] widget error", code ?? "(no code)");
            setFailed(code ? String(code) : "widget");
          },
        });
        onReadyRef.current?.({ reset });
      })
      .catch((err) => {
        console.error("[turnstile] script failed to load", err);
        setFailed("script");
      });

    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current);
        widgetId.current = null;
      }
    };
  }, [siteKey, locale, reset]);

  if (!siteKey) return null;

  return (
    <div className="fld" style={{ marginTop: 14 }}>
      <div ref={boxRef} />
      {failed && (
        <span className="formstatus err" style={{ marginTop: 8 }}>
          לא הצלחנו לטעון את בדיקת האבטחה. אפשר לרענן את הדף, או לכתוב לנו בוואטסאפ.{" "}
          {/* The code is what makes this fixable rather than mysterious — it
              tells whoever is debugging whether the domain, the key or the
              network is at fault. Small and muted; nobody else needs it. */}
          <span className="mono" style={{ opacity: 0.6, fontSize: 11 }}>
            ({failed})
          </span>
        </span>
      )}
    </div>
  );
}
