## Summary

Updates **README.md** with a **Screenshots** section: three visuals for **home (`/`)**, **classic workspace (`/classic`)**, and **workflow studio (`/studio`)**. Assets are **SVG vector previews** under `docs/screenshots/` (reliable on GitHub and lightweight); they mirror current UI colors and layout. Optional note in README explains how to swap in PNG captures later.

## Changes

- `docs/screenshots/01-landing.svg` — dual-card landing.
- `docs/screenshots/02-classic-workspace.svg` — classic header, connection card, tabs, JSON area.
- `docs/screenshots/03-workflow-studio.svg` — studio top bar, step pills, Connect card.
- `README.md` — new **Screenshots** table with captions.

## Why SVG (not PNG) in-repo

Headless Chromium segfaulted on the ARM build agent when attempting automated PNG capture. SVG previews document the UI without binary churn; maintainers can drop in PNGs with the same filenames if desired.

## Checklist

- [x] README renders on GitHub (relative image paths).
- [ ] After merge, optionally attach real PNGs from `npm run dev` for marketing.
