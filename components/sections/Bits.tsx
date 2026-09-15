import Link from "next/link";

/**
 * The arrow on a call-to-action. Drawn pointing inline-forward for RTL (left),
 * and mirrored for LTR by CSS — the same convention the testimonial chevrons
 * use. It replaces the literal "→" that used to sit inside the label text,
 * which pointed the wrong way in Hebrew and could not be styled.
 */
export function ArrowIcon() {
  return (
    <svg
      className="ico-arrow"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

export function PageIntro({
  eyebrow,
  h1,
  lead,
}: {
  eyebrow?: string;
  h1: string;
  lead: string;
}) {
  return (
    <div className="pintro reveal">
      {eyebrow && (
        <span className="eyebrow">
          <span className="d" />
          {eyebrow}
        </span>
      )}
      <h1>{h1}</h1>
      <p className="lead">{lead}</p>
    </div>
  );
}

export function CtaBlock({
  cta,
  href,
}: {
  cta: { h2: string; p: string; primary: string };
  href: string;
}) {
  return (
    <div className="ctasection reveal">
      <h2>{cta.h2}</h2>
      <p>{cta.p}</p>
      <div className="ctarow">
        <Link className="pill pill-w" href={href}>
          {cta.primary}
          <ArrowIcon />
        </Link>
      </div>
    </div>
  );
}
