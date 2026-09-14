# Fonts

All three are SIL Open Font Licence 1.1 — free for commercial use.

| File | Family | Role | Weight shipped |
| --- | --- | --- | --- |
| `rubik-*.woff2` | **Rubik** | Display — headings, numerals | 700 only |
| `assistant-*.woff2` | **Assistant** | Body — all running text | 400–700 variable |
| `jetbrains-mono-latin.woff2` | **JetBrains Mono** | Labels, eyebrows, figures (`--mono`) | 400 only |

Self-hosted on purpose: no runtime call to fonts.googleapis.com, so the site
builds without network access and sends no visitor data to Google.

## Why these files are small

~57KB for the whole set, against ~144KB unsubset:

- **Weight-pinned.** The CSS only ever asks for Rubik 700 and JetBrains Mono
  400, so those ship as single weights rather than a 300–900 variable axis.
  Assistant keeps its 400–700 range — body text, pills and bold labels use it.
- **Latin is subset to ASCII** plus the marks the copy uses (`· – — … ‹ › → ← ₪`).
  A rare accented character would fall back to a system font; the site's Latin
  is brand names and product words, so that does not come up in practice.
- **Hebrew keeps its full charset**, since the copy changes and must not break.
- Split latin / hebrew by `unicode-range`, so a page pulls only what it paints.

## If you swap a face

**Rename the file.** `next.config.mjs` serves `/fonts/*` with
`max-age=31536000, immutable`, so a same-named replacement would be ignored for
a year by any browser that already cached it. A new filename busts it cleanly.

Source: https://fonts.google.com/specimen/Rubik ·
https://fonts.google.com/specimen/Assistant ·
https://fonts.google.com/specimen/JetBrains+Mono
