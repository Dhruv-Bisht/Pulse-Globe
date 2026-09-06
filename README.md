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

## Time range slider

A slider (top right of the globe) lets you pick anywhere from **1 hour to 1 year**:

- **1h – 7d**: uses GDELT's GEO 2.0 API in `PointData` mode, which returns a real per-article lat/lon. This is the most precise mode and is what the globe used before.
- **1mo – 1y**: GEO 2.0 can't search back that far, so these ranges use the GDELT DOC 2.0 API (`mode=artlist`), which returns up to a year of articles but only a source *country*, not a point. Those stories are placed at a jittered country centroid (`lib/country-centroids.js`) and the news panel says so (`countryLevel: true`).

## Category filters & the "new tech" spotlight

The legend chips are now clickable filters — click a category to hide/show it on the globe. The **Technology** category is the spotlighted one: its pins get an extra pulsing cyan halo and its legend chip carries a "NEW TECH" badge, so newly-created technology coverage stands out at a glance.

## Richer story detail

Clicking a pulse opens the panel immediately with what GDELT already gave us, then calls `/api/enrich?url=...` in the background to fetch the actual article page and pull real `og:` metadata — description, image, site name, and published time — plus a fallback first-paragraph excerpt if there's no meta description. If the source can't be reached (blocked, slow, or gone), the panel just keeps showing the GDELT-derived summary and says so.
