# Pulse — a living globe of tech news

A rotating 3D globe (React + Next.js + three.js) that plots tech-news
markers by city. Each marker pulses brighter when fresh and fades out over
24 hours, then disappears. Visitors can only view — news is added by you,
through a protected API, never through the site itself.

## Stack

- **Next.js / React** — frontend + API routes
- **Node.js** — the API routes run on the Node runtime (not Edge), since the
  AWS SDK needs Node APIs
- **DynamoDB** — stores news items; a native TTL attribute auto-purges rows
  ~24h after they're posted, in addition to the API filtering by timestamp
  on every read
- **three.js** — renders the globe, drawn straight to a `<canvas>` inside a
  client component

## 1. Create the DynamoDB table

Using the AWS CLI (adjust the region as needed):

```bash
aws dynamodb create-table \
  --table-name PulseNews \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

`PAY_PER_REQUEST` (on-demand) billing keeps this inside the DynamoDB free
tier for a low-traffic project like this — you pay per request instead of
provisioning capacity you don't use.

Then turn on TTL on the `ttl` attribute (one-time console step, or via CLI):

```bash
aws dynamodb update-time-to-live \
  --table-name PulseNews \
  --time-to-live-specification "Enabled=true, AttributeName=ttl" \
  --region us-east-1
```

## 2. IAM permissions

Whatever runs the app (an IAM role attached to your EC2 instance / App
Runner service / Amplify app, or a local `aws configure` profile) needs:

- `dynamodb:PutItem`
- `dynamodb:Scan`
- `dynamodb:DeleteItem`

scoped to the `PulseNews` table's ARN.

## 3. Configure environment variables

Copy `.env.example` to `.env.local` and fill in:

- `AWS_REGION` — same region as the table
- `DYNAMODB_TABLE` — `PulseNews` (or whatever you named it)
- `API_SECRET` — a long random string you generate yourself (`openssl rand
  -hex 32`); this is the only thing standing between the public internet and
  your POST/DELETE endpoints, so keep it out of source control and out of
  any client-side code
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` — only if you're not using an
  IAM role (e.g. running locally without an `aws configure` profile)

## 4. Run locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` — the globe will show "No reports in the last
24 hours" until you post something.

## 5. Post news (the only way news gets in)

```bash
API_SECRET=your-secret BASE_URL=http://localhost:3000 \
  node scripts/post-news.js \
  "Startup ships on-device translation model" \
  "The model runs fully offline on phone-class hardware and claims parity with cloud models on common language pairs." \
  "Tokyo" \
  "AI"
```

`category` must be one of: `AI`, `Hardware`, `Software`, `Security`,
`Business`, `Space`. `city` must match a name in `lib/cities.js` — extend
that list with more cities if you need somewhere it doesn't cover.

To retract something early:

```bash
curl -X DELETE https://your-domain/api/news/<item-id> \
  -H "x-api-key: your-secret"
```

Optional: `scripts/generate-ai-news.js` asks Claude to draft several items
and posts them for you in one go — useful for seeding a demo, or as a
starting point you edit before posting for real. It needs
`ANTHROPIC_API_KEY` set. It's just a script you run yourself; nothing about
it is reachable from the deployed site.

## 6. Deploy to AWS

Two straightforward paths:

**AWS Amplify Hosting (recommended)** — supports Next.js server-rendering
directly, has a free tier, and deploys straight from a Git repo:
1. Push this project to a Git repo.
2. In the Amplify console, "New app" → "Host web app" → connect the repo.
3. Add the environment variables from step 3 in the Amplify app's
   environment variable settings.
4. Attach an IAM service role to the Amplify app with the DynamoDB
   permissions from step 2 (Amplify console → App settings → IAM role).
5. Deploy — Amplify builds and hosts it.

**EC2 (more manual, more control)**:
1. Launch a `t3.micro`/`t2.micro` instance (free tier eligible for the
   first 12 months) with an attached IAM role granting the DynamoDB
   permissions above.
2. Install Node.js, clone the repo, `npm install`, `npm run build`.
3. Run it with a process manager: `pm2 start npm --name pulse -- start`.
4. Put it behind Nginx (or an Application Load Balancer) for TLS/port 80.

Either way, nothing in the frontend bundle contains `API_SECRET` — it's only
read server-side inside the API route handlers, so it's safe even though
the rest of the app is public.

## Extending

- **More cities**: add entries to `CITIES` in `lib/cities.js` — the API
  validates against this list, so both the poster script and the frontend
  automatically pick up new ones.
- **Scale past Scan**: `lib/dynamo.js` currently does a table Scan filtered
  by timestamp, which is fine for a rolling day of items. If you post at
  high volume, add a Global Secondary Index with a constant partition key
  and `timestamp` as the sort key, and swap the Scan for a Query — the item
  shape doesn't need to change.
- **Scheduled auto-posting**: wire `scripts/generate-ai-news.js` (or your
  own real news source) into an EventBridge Scheduler rule invoking a
  Lambda, or a cron job on the EC2 box, if you want new items to appear on
  a timer without running the script by hand.
