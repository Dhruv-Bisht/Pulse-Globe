# StartupPulse

Interactive 3D startup ecosystem explorer built with Next.js, React Three Fiber and Three.js.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Vercel

Import the repository into Vercel. No environment variables are required for the demo.

## Data model

The included dataset is intentionally a **demo seed dataset**. It should not be presented as a live or authoritative valuation database. Replace `lib/data.ts` with a licensed/current data source before public investment use.

## Product direction

- Geographic startup discovery
- Industry/stage/valuation filtering
- Company intelligence cards
- Founder/investor opportunity lens
- `/api/startups` JSON endpoint

The product's working definition is emerging/private startups with reported or estimated valuation at or below $500M; companies whose valuation is above that threshold are excluded by the UI filter. Because private-company valuations are frequently undisclosed, the production version should store valuation status and source/date fields.
