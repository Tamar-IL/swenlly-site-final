"use client";

import { useEffect, useRef } from "react";

export function HeroDotsCard({
  className = "",
  style,
  children,
}: {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const target = useRef({ x: 0, y: 0 });
  const pos = useRef({ x: 0, y: 0 });
  const raf = useRef<number | null>(null);

  // the lens eases toward the pointer rather than snapping to it
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const tick = () => {
      pos.current.x += (target.current.x - pos.current.x) * 0.08;
      pos.current.y += (target.current.y - pos.current.y) * 0.08;
      el.style.setProperty("--mx", `${pos.current.x}px`);
      el.style.setProperty("--my", `${pos.current.y}px`);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    };
  }, []);

  const move = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    target.current = { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const enter = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // start the lens where the pointer entered, so it fades in in place
    pos.current = { x: e.clientX - r.left, y: e.clientY - r.top };
    target.current = { ...pos.current };
    el.style.setProperty("--lens", "1");
  };

  const leave = () => ref.current?.style.setProperty("--lens", "0");

  return (
    <div
      ref={ref}
      className={className}
      style={style}
      onMouseMove={move}
      onMouseEnter={enter}
      onMouseLeave={leave}
    >
      {children}
    </div>
  );
}
