# Pulse Globe — Vercel Live News

Pulse Globe is a Next.js + Three.js globe that displays geographically mapped global news from the GDELT Project.

## Vercel deployment

No AWS account, DynamoDB, Amplify, API key, or GitHub Action is required.

### Deploy

1. Push this repository to GitHub.
2. Import it into Vercel.
3. Select the Next.js framework preset.
4. Use the default build command: `next build`.
5. Deploy.

There are no required environment variables.

## News architecture

```text
Browser
   ↓
/api/news (Vercel serverless function)
   ↓
GDELT GEO 2.0 API
   ↓
geographic news points
   ↓
Three.js globe
```

The API requests the previous 24 hours, extracts multiple articles for each geographic point, deduplicates them, and returns up to 100 stories.

GDELT is polled through Vercel's server-side fetch cache for 15 minutes because GDELT itself updates on roughly that cadence.
