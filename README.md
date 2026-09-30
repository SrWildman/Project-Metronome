# Project Metronome

Listening Responsibility Calculator (COP4331-FAL15 Group 34). Helps marching arts directors see
where on the field students should listen to the metronome/drumline and where sound delay will
affect ensemble timing.

## Stack

Static single-page app: Vite + React + TypeScript, tested with Vitest. There is no server; all
calculation happens in the browser.

- `src/core/` – pure calculation code (field geometry, sound-delay model). No UI dependencies.
- `src/components/` – React UI; the map is drawn on a `<canvas>`.
- `test/` – unit tests for `src/core`.

## Development

Requires Node.js 20+ (see `.nvmrc`).

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests
npm run lint
npm run typecheck
npm run build      # static site in dist/
```

## Deployment

Pushes to `main` deploy to GitHub Pages via `.github/workflows/deploy.yml`. One-time setup:
repo **Settings → Pages → Source: GitHub Actions**. The site is served from
`https://<owner>.github.io/<repo>/`; the workflow sets `BASE_PATH` accordingly.
