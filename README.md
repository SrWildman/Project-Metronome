# Project Metronome

Listening Responsibility Calculator (COP4331-FAL15 Group 34). Helps marching arts staff see where on
the field players should listen to the metronome/drumline, where they should watch the conductor
instead, and how far off the sound will be.

## What it does

- **Drag to explore.** Drag the time source(s), focal point and player marker on the map (or use the
  arrow keys), or type positions in band jargon (yard line, steps, hash) or feet.
- **Live results** for the player marker: delay in ms and counts, the zone, and what the player should do.
- **Multiple time sources**, football fields (high school, college), gyms and custom-size venues.
- **Tempo sections** for shows with tempo changes, with a comparison table.
- **Weather**: temperature (with optional auto-fill) and wind change the speed of sound.
- **Hear the delay** with a click-track demo, and **How is this calculated?** with the actual numbers.
- **Shareable links**: the whole setup is saved in the URL.
- **Works on phones and offline** (installable PWA), and is keyboard accessible with a color-blind-safe
  palette and optional patterns.

## Stack

A static single-page app (no server): Vite, React, TypeScript, Tailwind CSS. The map is painted
pixel-by-pixel on a 2D canvas on the CPU, so it doesn't need a GPU or WebGL.

- `src/core/` – calculation code: field geometry, physics, delay model, URL state, map rendering.
  No UI dependencies, so it can be reused by a future backend or worker.
- `src/components/`, `src/hooks/` – React UI.
- `test/` – unit tests (Vitest). `e2e/` – browser tests (Playwright), including accessibility checks.

## Development

Requires Node.js 20+ (see `.nvmrc`).

```sh
npm install
npm run dev         # http://localhost:5173
npm test            # unit tests
npm run e2e         # browser tests (first: npx playwright install chromium)
npm run lint
npm run typecheck
npm run build       # static site in dist/
```

If Playwright can't download a browser, point it at an installed Chromium with
`CHROMIUM_PATH=/path/to/chromium npm run e2e`.

## Deployment

Pushes to `main` deploy to GitHub Pages via `.github/workflows/deploy.yml`. One-time setup:
repo **Settings → Pages → Source: GitHub Actions**. The site is served from
`https://<owner>.github.io/<repo>/`; the workflow sets `BASE_PATH` accordingly.
