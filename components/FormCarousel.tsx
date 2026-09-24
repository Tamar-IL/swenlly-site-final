"use client";

import { useCallback, useRef, useState } from "react";

export type FormShot = { src: string; cap: string; sub: string };

/**
 * Real forms we built, one at a time.
 *
 * A grid was wrong for these: they are phone-shaped screenshots of five
 * different clients' branding, and side by side they read as a swatch book
 * rather than as five finished products. One at a time gives each its own
 * frame, and the caption says what to notice before the eye lands on it.
 *
 * A crossfade rather than a sliding track: every slide sits in the same box, so
 * there is no direction arithmetic to get backwards in RTL, and the images are
 * all in the DOM from the start — a click never waits on a download.
 */
export function FormCarousel({
  items,
  prev,
  next,
  hint,
}: {
  items: FormShot[];
  prev: string;
  next: string;
  hint: string;
}) {
  const [idx, setIdx] = useState(0);
  const touchX = useRef<number | null>(null);

  // Cyclic: an arrow that can dead-end invites a click that does nothing.
  const go = useCallback(
    (step: number) => setIdx((i) => (i + step + items.length) % items.length),
    [items.length]
  );

  const shot = items[idx];

  return (
    <div
      className="fcar"
      role="group"
      aria-roledescription="carousel"
      onKeyDown={(e) => {
        // The page reads right to left, so the left arrow moves forward.
        if (e.key === "ArrowLeft") { e.preventDefault(); go(1); }
        else if (e.key === "ArrowRight") { e.preventDefault(); go(-1); }
      }}
    >
      {/* Caption above the shot, the same way round as the CRM gallery. */}
      <div className="fcar-cap">
        <span className="shot-c">{shot.cap}</span>
        <span className="shot-s">{shot.sub}</span>
      </div>

      <div
        className="fcar-stage"
        onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          const from = touchX.current;
          touchX.current = null;
          if (from === null) return;
          const dx = e.changedTouches[0].clientX - from;
          // Ignore a tap or a vertical scroll that wobbled sideways.
          if (Math.abs(dx) < 40) return;
          go(dx > 0 ? -1 : 1);
        }}
      >
        {/* The frame comes first in the source so that at phone width, where the
            arrows drop underneath it, no reordering is needed. On wider screens
            `order` puts the previous arrow back on the reading edge. */}
        <div className="fcar-frame">
          {items.map((it, i) => (
            <img
              key={it.src}
              className={`fcar-img${i === idx ? " on" : ""}`}
              src={it.src}
              alt={it.cap}
              aria-hidden={i === idx ? undefined : true}
              /* The first is what the visitor sees; the rest can wait for idle,
                 but they are still fetched, so a click is instant. */
              loading={i === 0 ? "eager" : "lazy"}
              decoding="async"
            />
          ))}
        </div>

        <button type="button" className="fcar-nav is-prev" onClick={() => go(-1)} aria-label={prev}>
          <Chevron dir="prev" />
        </button>
        <button type="button" className="fcar-nav is-next" onClick={() => go(1)} aria-label={next}>
          <Chevron dir="next" />
        </button>
      </div>

      <div className="fcar-foot">
        <div className="fcar-dots">
          {items.map((it, i) => (
            <button
              type="button"
              key={it.src}
              className={`fcar-dot${i === idx ? " on" : ""}`}
              onClick={() => setIdx(i)}
              aria-label={it.cap}
              aria-current={i === idx || undefined}
            />
          ))}
        </div>
        <span className="fcar-hint">{hint}</span>
      </div>
    </div>
  );
}

/** Points the way it moves: forward is leftwards on a right-to-left page. */
function Chevron({ dir }: { dir: "prev" | "next" }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={dir === "next" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
    </svg>
  );
}
