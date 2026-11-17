# Agentic Squared

The static site for Agentic Squared, served by GitHub Pages.

- Copy lives in `i18n/en.json` and `i18n/es.json` (neutral Latin American Spanish, our own translation). Both must have the same keys.
- `src/page.html` is the one template. `node scripts/build.mjs` writes `index.html`, `es/index.html` and `404.html`, and fails on a missing key or placeholder. Commit the built pages.
- `ds/` is a stripped copy of the design system (agentic brand only). Refresh it with `DS_DIR=<design system checkout> scripts/sync-design-system.sh`.
- Language: `?lang=en|es`, then `/es/`, then the visitor's menu choice, browser and time zone. The menu links are relative, so they work under the Pages subpath.
