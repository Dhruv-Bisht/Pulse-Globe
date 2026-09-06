# Pulse Globe — AWS Amplify Ready

A read-only global news globe built with Next.js App Router and DynamoDB.

## What changed in this version

- The globe is now a real, textured, rotatable 3D Earth (WebGL via `three.js`) instead of a flat circle — drag to spin it, scroll to zoom.
- News markers sit on the actual lat/lon on the sphere, pulse, are color-coded by category, show a hover tooltip, and open the full story panel on click.
- Added `three` as a dependency — run `npm install` again after pulling this version.
- No `@/` import aliases — imports use stable relative paths.
- Next.js 15 SSR/API deployment supported by AWS Amplify Hosting.
- `amplify.yml` is already configured with `.next` as the artifact directory.
- Public users can only `GET /api/news`.
- `POST` and `DELETE` require the private `x-api-key` and are not exposed in the UI.
- DynamoDB errors do not make the demo page blank when `DEMO_MODE=true`.
- Includes clearly-labelled demo stories so the globe has visible markers immediately.
- Includes a seed script for writing test stories to your DynamoDB-backed API.
- `post-news.js` works with both `http://` and `https://`.

## 1a. Get real news onto the globe

The public `GET /api/news` endpoint now has a live GDELT fallback. It first tries DynamoDB, but if DynamoDB is empty or unavailable it directly fetches real, already-geocoded stories from the GDELT GEO 2.0 API. This prevents an AWS/IAM/configuration problem from turning the globe into `News service unavailable`. GDELT is a free global news data source with coverage across more than 100 languages and countries. The background ingestion script is still included so you can persist stories into DynamoDB.

Run it once locally:

```bash
PULSE_GLOBE_URL=http://localhost:3000 API_SECRET=your-secret node scripts/fetch-live-news.js
```

To keep the globe live in production, run it on a schedule. The easiest option if your code is on GitHub is the included `.github/workflows/fetch-news.yml` — just add two repo secrets (`PULSE_GLOBE_URL` pointing at your deployed Amplify URL, and `API_SECRET` matching your `.env`/Amplify environment variable) and it runs every 20 minutes automatically. If you'd rather stay inside AWS, wire the same script into an EventBridge Scheduler rule that invokes a small Lambda.

If you want different or narrower topics (e.g. tech-only), edit the `CATEGORY_QUERIES` object at the top of the script — each entry is just a GDELT keyword query.

## 1b. Run locally

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open http://localhost:3000.

With `DEMO_MODE=true`, the globe displays demo markers even before DynamoDB is configured.

## 2. DynamoDB

Create a table named `PulseGlobeNews`.

Primary key:
- Partition key: `pk` (String)
- Sort key: `id` (String)

Create a GSI:
- Index name: `NewsByTime`
- Partition key: `pk` (String)
- Sort key: `createdAt` (Number)

Enable DynamoDB TTL on:
- `expiresAt`

The app only queries the last 24 hours. Items are also given an expiry timestamp for cleanup. If DynamoDB cannot be queried, the API falls back to live GDELT data.

## 3. Environment variables

Set these in Amplify App settings → Environment variables:

```text
AWS_REGION=ap-south-1
DYNAMODB_TABLE=PulseGlobeNews
API_SECRET=<long-random-secret>
DEMO_MODE=false
```

Do NOT prefix `API_SECRET` with `NEXT_PUBLIC_`.

## 4. IAM

The Amplify Hosting compute service role needs DynamoDB permissions for this table:
- dynamodb:Query
- dynamodb:PutItem
- dynamodb:DeleteItem

The application uses the AWS SDK default credential provider chain. Do not put AWS access keys in the browser or commit them to Git.

## 5. Seed stories

After deployment:

```bash
set PULSE_GLOBE_URL=https://YOUR-AMPLIFY-DOMAIN
set API_SECRET=YOUR_SECRET
npm run seed
```

On PowerShell:

```powershell
$env:PULSE_GLOBE_URL="https://YOUR-AMPLIFY-DOMAIN"
$env:API_SECRET="YOUR_SECRET"
npm run seed
```

Or post one story:

```powershell
$env:NEWS_TITLE="Example"
$env:NEWS_SUMMARY="Example summary"
$env:NEWS_CITY="Bengaluru"
$env:NEWS_COUNTRY="India"
$env:NEWS_LAT="12.9716"
$env:NEWS_LON="77.5946"
$env:API_SECRET="YOUR_SECRET"
npm run post-news
```

## 6. Amplify deployment

Push this repository to GitHub and connect `main` in AWS Amplify.

For this project:
- Framework: Next.js
- Monorepo app root: leave EMPTY
- Build command: `npm run build`
- Output directory: `.next`

If Amplify asks for a service role, create/use one that can access DynamoDB as described above.

## Architecture

```text
Browser
  |
  | GET /api/news every 45 seconds
  v
Next.js API route
  |
  v
DynamoDB Query (last 24h)
  |
  v
Pulse Globe markers

Private ingestion:
script -> POST /api/news + x-api-key -> DynamoDB
```

The browser never receives `API_SECRET`.

## Important

`DEMO_MODE=true` is useful while setting up the project. For the final portfolio deployment, use:

```text
DEMO_MODE=false
```

and seed your own stories through the private script/API.

This project deliberately avoids Edge API Routes because Amplify's Next.js compute support is designed for Node.js API routes.

## License

MIT
