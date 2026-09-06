# Pulse Globe — AWS Amplify-ready

A read-only public Next.js globe that displays news created through a protected API.

## Architecture

Browser → Next.js on AWS Amplify → `/api/news` → DynamoDB

Visitors can only `GET` recent stories. `POST` and `DELETE` require `x-api-key: API_SECRET`.

## 1. Requirements

- Node.js 20+
- npm
- AWS account
- GitHub repository
- DynamoDB table

## 2. DynamoDB table

Create a table named `PulseGlobeNews` with:

- Partition key: `pk` (String)
- Sort key: `id` (String)

Enable TTL on attribute:

- `expiresAt`

The application uses `pk = NEWS` and `createdAt` as the sort key condition in its query. For DynamoDB Query to work efficiently with the supplied schema, create a GSI named `NewsByTime`:
- Partition key: `pk` (String)
- Sort key: `createdAt` (Number)

Then update `lib/dynamo.js` `QueryCommand` with:
`IndexName: "NewsByTime"`.

Alternatively, if you prefer no GSI, replace the query with a Scan + filter for a small portfolio dataset.

## 3. IAM

The identity used by the Next.js server needs:
- dynamodb:Query
- dynamodb:PutItem
- dynamodb:DeleteItem

restricted to the `PulseGlobeNews` table and its `NewsByTime` index.

## 4. Environment variables

Local `.env.local`:

AWS_REGION=ap-south-1
DYNAMODB_TABLE=PulseGlobeNews
API_SECRET=use-a-long-random-secret

Never commit `.env.local`.

In Amplify, add the same variables under Environment variables. `API_SECRET` must remain server-only; do not prefix it with `NEXT_PUBLIC_`.

## 5. Local run

npm ci
npm run dev

Then open http://localhost:3000.

Test production build:

npm run build
npm start

## 6. Amplify

This repository already contains `amplify.yml`.

Important settings:
- This is NOT a monorepo.
- Leave "Monorepo app root" empty.
- Framework: Next.js
- Build command: `npm run build`
- Build output: `.next`

AWS documents `.next` as the correct artifact directory for Next.js SSR apps when using an amplify.yml build specification.

Connect the GitHub repository to Amplify and deploy the `main` branch.

## 7. Add news

Local:

API_SECRET=... PULSE_GLOBE_URL=http://localhost:3000 node scripts/post-news.js "Headline" "Gist sentence." "Tokyo" "AI" 35.6762 139.6503

Production:

API_SECRET=... PULSE_GLOBE_URL=https://YOUR-APP.amplifyapp.com node scripts/post-news.js "Headline" "Gist sentence." "Tokyo" "AI" 35.6762 139.6503

No admin UI is exposed.

## 8. Security notes

- Never expose API_SECRET to client-side code.
- Do not put AWS credentials in browser code.
- Prefer an IAM role for the server runtime rather than long-lived AWS access keys.
- Keep the API secret long and random.
- DynamoDB TTL is eventual, so the application also filters by the last 24 hours on reads.

## 9. Troubleshooting

If Amplify reports missing modules:
- Keep imports relative (`../components/...`, `../../../lib/...`) as this project does.
- Do not depend on Windows case-insensitivity.
- Commit every referenced file to Git.
- Run `npm ci && npm run build` locally before pushing.

If Amplify reports an artifact/baseDirectory error:
- Ensure the repository `amplify.yml` is present at the repository root.
- Ensure `baseDirectory: .next`.
- Ensure the app is configured as a normal Next.js app, not a monorepo.

If DynamoDB returns AccessDenied:
- Check the Amplify SSR service role/runtime permissions.
- Verify the region and table name.
