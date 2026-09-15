"use client";

import { useMemo, useRef, useState } from "react";

/* The domains Israeli small-business owners actually type. Ordered by how often
   they turn up, because the first suggestion is the one most people take. */
const DOMAINS = [
  "gmail.com",
  "walla.co.il",
  "hotmail.com",
  "outlook.com",
  "yahoo.com",
  "icloud.com",
  "012.net.il",
  "bezeqint.net",
];

/**
 * An email input that completes the domain once "@" is typed.
 *
 * It is a plain text input with a list under it rather than a datalist: a
 * datalist cannot be styled to match the site, and on mobile it is either
 * invisible or a full-screen takeover depending on the browser.
 */
export function EmailField({
  id,
  name,
  placeholder,
  ariaLabel,
  required,
  value,
  onChange,
}: {
  id?: string;
  name: string;
  placeholder?: string;
  ariaLabel?: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => {
    const at = value.indexOf("@");
    // Nothing to suggest before the @, or once the address already looks whole.
    if (at < 1) return [];
    const local = value.slice(0, at);
    const typed = value.slice(at + 1).toLowerCase();
    const matches = DOMAINS.filter((d) => d.startsWith(typed) && d !== typed);
    return matches.slice(0, 5).map((d) => `${local}@${d}`);
  }, [value]);

  const show = open && suggestions.length > 0;

  function choose(next: string) {
    onChange(next);
    setOpen(false);
    setActive(0);
  }

  return (
    <div
      className="emailfield"
      ref={box}
      onBlur={(e) => {
        // Only close when focus actually leaves the field and its list —
        // otherwise clicking a suggestion closes it before the click lands.
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <input
        id={id}
        name={name}
        type="email"
        inputMode="email"
        autoComplete="email"
        required={required}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-expanded={show}
        aria-autocomplete="list"
        role="combobox"
        aria-controls={show ? `${name}-suggest` : undefined}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onKeyDown={(e) => {
          if (!show) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => (i + 1) % suggestions.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => (i - 1 + suggestions.length) % suggestions.length);
          } else if (e.key === "Enter" || e.key === "Tab") {
            // Enter completes the address rather than submitting the form —
            // submitting a half-typed address is the mistake this exists to stop.
            e.preventDefault();
            choose(suggestions[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {show && (
        <ul className="emailsuggest" id={`${name}-suggest`} role="listbox">
          {suggestions.map((sug, i) => (
            <li key={sug} role="option" aria-selected={i === active}>
              <button
                type="button"
                className={i === active ? "on" : undefined}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(sug)}
              >
                {sug}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
