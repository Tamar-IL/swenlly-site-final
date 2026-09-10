# Fonts

| File | Family | Licence |
| --- | --- | --- |
| `rubik-*.woff2` | **Rubik** — display / headings. Hebrew + Latin variable font, weights 300–900. | SIL Open Font Licence 1.1 |
| `assistant-*.woff2` | **Assistant** — body text. Hebrew + Latin variable font, weights 200–800. | SIL Open Font Licence 1.1 |
| `jetbrains-mono-*.woff2` | **JetBrains Mono** — small tracked-out labels, eyebrows and tabular figures (`--mono`). Latin variable font, weights 400–700. | SIL Open Font Licence 1.1 |

Rubik, Assistant and JetBrains Mono are free for commercial use under the OFL and are self-hosted
here on purpose: no runtime call to fonts.googleapis.com, so the site keeps working
offline, builds without network access, and sends no visitor data to Google.

Each family is split into `latin`, `latin-ext` and (where it has one) `hebrew` subsets, matched by
`unicode-range` in `app/globals.css` — a visitor only downloads the subsets the
page actually renders.

JetBrains Mono carries no Hebrew, which is deliberate: every `--mono` rule sets
`direction: ltr`, so the stack falls through to Assistant for Hebrew labels
instead of landing on whatever monospace the visitor's OS keeps for Hebrew.

Source: https://fonts.google.com/specimen/Rubik ·
https://fonts.google.com/specimen/Assistant ·
https://fonts.google.com/specimen/JetBrains+Mono
