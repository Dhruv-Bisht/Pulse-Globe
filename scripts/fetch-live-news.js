/**
 * Pulls real, geocoded news from the GDELT Project's free GEO 2.0 API
 * (https://api.gdeltproject.org — no signup, no API key) and posts each
 * story into this app's own /api/news endpoint, the same way scripts/post-news.js
 * does it manually.
 *
 * Run it once:
 *   PULSE_GLOBE_URL=https://your-site.example API_SECRET=xxxx node scripts/fetch-live-news.js
 *
 * Run it on a schedule (recommended): every 15-30 minutes via cron, a GitHub
 * Actions scheduled workflow, or an AWS EventBridge Scheduler rule. GDELT
 * itself only refreshes every 15 minutes, so there's no benefit to polling
 * more often than that.
 */

const target = new URL(process.env.PULSE_GLOBE_URL || "http://localhost:3000");
const API_SECRET = process.env.API_SECRET || "";
const PER_CATEGORY_LIMIT = Number(process.env.NEWS_PER_CATEGORY || 4);

if (!API_SECRET) {
  console.error("Set API_SECRET (same value as your .env.local) before running this script.");
  process.exit(1);
}

// One GDELT keyword query per category shown in the app's legend (lib/categories.js).
const CATEGORY_QUERIES = {
  Technology: "technology OR artificial intelligence OR startup OR software OR semiconductor",
  Business: "business OR economy OR markets OR trade OR earnings",
  Climate: "climate OR renewable energy OR emissions OR drought OR wildfire",
  Science: "science OR research OR space OR discovery",
  Health: "health OR medicine OR outbreak OR hospital",
  World: "government OR election OR diplomacy OR conflict"
};

function gdeltUrl(query) {
  const params = new URLSearchParams({
    query,
    format: "geojson",
    mode: "pointdata",
    timespan: "1440", // last 24 hours, matches the app's window
    maxpoints: "10"
  });
  return `https://api.gdeltproject.org/api/v2/geo/geo?${params.toString()}`;
}

// GDELT's popup field is a small HTML blob with up to 5 "<a href=...>Title</a>"
// links for that location. We only need the first (most relevant) one.
function firstArticle(html) {
  if (!html) return null;
  const match = /<a href="([^"]+)"[^>]*>([^<]+)<\/a>/i.exec(html);
  if (!match) return null;
  return { url: match[1], title: match[2].replace(/&#39;/g, "'").replace(/&amp;/g, "&").trim() };
}

function splitLocationName(name) {
  // GDELT names look like "San Francisco, California, United States" or just "France".
  const parts = (name || "").split(",").map((p) => p.trim()).filter(Boolean);
  const city = parts[0] || "Unknown";
  const country = parts.length > 1 ? parts[parts.length - 1] : parts[0] || "";
  return { city, country };
}

function domainOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "GDELT";
  }
}

async function fetchCategory(category, query) {
  const res = await fetch(gdeltUrl(query), { headers: { "User-Agent": "pulse-globe/1.0" } });
  if (!res.ok) {
    console.warn(`GDELT request failed for ${category}: ${res.status}`);
    return [];
  }
  const geo = await res.json();
  const items = [];

  for (const feature of geo.features || []) {
    if (items.length >= PER_CATEGORY_LIMIT) break;
    const [lon, lat] = feature.geometry?.coordinates || [];
    if (typeof lat !== "number" || typeof lon !== "number") continue;

    const article = firstArticle(feature.properties?.html);
    if (!article) continue;

    const { city, country } = splitLocationName(feature.properties?.name);
    items.push({
      title: article.title,
      summary: `Reported near ${city}${country && country !== city ? `, ${country}` : ""} in the last 24 hours. Source: ${domainOf(article.url)}.`,
      city,
      country,
      category,
      source: domainOf(article.url),
      lat,
      lon
    });
  }
  return items;
}

async function postItem(item) {
  const res = await fetch(new URL("/api/news", target), {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": API_SECRET },
    body: JSON.stringify(item)
  });
  const text = await res.text();
  if (!res.ok) console.warn(`POST failed (${res.status}): ${item.title} — ${text}`);
  return res.ok;
}

(async () => {
  let posted = 0;
  for (const [category, query] of Object.entries(CATEGORY_QUERIES)) {
    const items = await fetchCategory(category, query);
    for (const item of items) {
      const ok = await postItem(item);
      if (ok) posted++;
    }
    console.log(`${category}: found ${items.length} location(s)`);
  }
  console.log(`Done. Posted ${posted} stories to ${target}.`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
