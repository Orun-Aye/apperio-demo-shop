# Demo Shop

A small coffee-kit store that exists to be watched. It runs at
[shop.demo.apperio.dev](https://shop.demo.apperio.dev), reports to the **Demo Shop**
project on [Apperio](https://www.apperio.dev) through the
[`apperio`](https://www.npmjs.com/package/apperio) SDK, and is connected to
Apperio's GitHub App, so its commits, deploys and issues show up there too.

Everything Apperio shows about this shop came through the same path a real
app's data takes: the SDK in the browser, the ingestion API, the GitHub App
webhooks, the deploy API and the AI layer. Nothing is written into Apperio's
database by hand.

## What's here

| Path | What it is |
|---|---|
| `public/` | The storefront. Plain ES modules, no bundler, so stack traces name the real files (`checkout.js`, not `chunk-4f2a.js`). |
| `api/` | Vercel functions with real latency: products, profiles, a flaky recommendations service, checkout. |
| `scripts/build.mjs` | Bundles the SDK into `public/vendor/` and writes `public/config.js` from environment variables. |
| `scripts/deploy.mjs` | `vercel deploy --prod`, then `POST /projects/:id/deployments` to Apperio. |
| `scripts/serve.mjs` | Local preview at `http://localhost:4173` without Vercel. |
| `traffic/run.mjs` | Synthetic shoppers driven by Playwright. Each one is a fresh browser, so a fresh session. |

## Running it

```sh
npm install
node scripts/serve.mjs                          # local preview, SDK off
npm run traffic -- --url http://localhost:4173 --minutes 2
```

Deploying goes through the Vercel REST API and needs a `.env.deploy` (gitignored):

```sh
VERCEL_TOKEN=...
APPERIO_PROJECT_ID=...
APPERIO_API_KEY=...
```

The API key is the project's ingestion key. It ends up in the browser like any
client-side SDK key, but it never lives in this repo.
