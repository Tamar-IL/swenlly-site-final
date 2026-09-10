# Fonts

| File | Family | Licence |
| --- | --- | --- |
| `rubik-*.woff2` | **Rubik** — display / headings. Hebrew + Latin variable font, weights 300–900. | SIL Open Font Licence 1.1 |
| `assistant-*.woff2` | **Assistant** — body text. Hebrew + Latin variable font, weights 200–800. | SIL Open Font Licence 1.1 |
| `fbeinstein-eng-medium.otf` | **FbEinstein English Medium** — Latin labels / eyebrows (`--mono`). | Fontbit, licensed separately |

Rubik and Assistant are free for commercial use under the OFL and are self-hosted
here on purpose: no runtime call to fonts.googleapis.com, so the site keeps working
offline, builds without network access, and sends no visitor data to Google.

Each family is split into `latin`, `latin-ext` and `hebrew` subsets, matched by
`unicode-range` in `app/globals.css` — a visitor only downloads the subsets the
page actually renders.

Source: https://fonts.google.com/specimen/Rubik · https://fonts.google.com/specimen/Assistant
