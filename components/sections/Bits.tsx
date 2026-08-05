import Link from "next/link";

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
        </Link>
      </div>
    </div>
  );
}
