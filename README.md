# Project Metronome

Listening Responsibility Calculator (COP4331-FAL15 Group 34).

## Development

Requires Node.js 20+ (see `.nvmrc`).

```sh
npm install
npm start        # http://localhost:3000 (override with PORT)
npm test         # unit tests (node:test)
npm run lint     # ESLint
```

The client is AngularJS 1.x (loaded from a CDN) served by an Express 4 app with Pug views.
