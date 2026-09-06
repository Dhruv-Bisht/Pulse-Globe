const GDELT_ENDPOINT = "https://api.gdeltproject.org/api/v2/geo/geo";

const CATEGORY_QUERIES = {
  Technology: "technology OR artificial intelligence OR startup OR software OR semiconductor",
  Business: "business OR economy OR markets OR trade OR earnings",
  Climate: "climate OR renewable energy OR emissions OR drought OR wildfire",
  Science: "science OR research OR space OR discovery",
  Health: "health OR medicine OR outbreak OR hospital",
  World: "government OR election OR diplomacy OR conflict"
};

const CATEGORY_LIMIT = 14;
const ARTICLES_PER_LOCATION = 2;
const MAX_TOTAL = 90;

function decodeHtml(value = "") {
  return value
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function articlesFromHtml(html) {
  if (!html) return [];
  const matches = [...html.matchAll(/<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
  return matches
    .map((m) => ({
      url: decodeHtml(m[1]).trim(),
      title: decodeHtml(m[2].replace(/<[^>]+>/g, "")).trim()
    }))
    .filter((x) => x.url && x.title);
}

function splitLocationName(name) {
  const parts = String(name || "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  return {
    city: parts[0] || "Unknown",
    country: parts.length > 1 ? parts[parts.length - 1] : parts[0] || "Unknown"
  };
}

function domainOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "GDELT";
  }
}

function gdeltUrl(query, maxpoints = CATEGORY_LIMIT) {
  const params = new URLSearchParams({
    query,
    format: "geojson",
    mode: "pointdata",
    timespan: "1440",
    maxpoints: String(maxpoints)
  });
  return `${GDELT_ENDPOINT}?${params.toString()}`;
}

async function fetchCategory(category, query) {
  const response = await fetch(gdeltUrl(query), {
    headers: { "User-Agent": "Pulse-Globe/3.0" },
    cache: "no-store",
    signal: AbortSignal.timeout(12000)
  });

  if (!response.ok) throw new Error(`GDELT ${category}: HTTP ${response.status}`);

  const geo = await response.json();
  const items = [];
  const seenUrls = new Set();
  const seenLocations = new Set();

  for (const feature of geo.features || []) {
    const coordinates = feature.geometry?.coordinates;
    const [lon, lat] = Array.isArray(coordinates) ? coordinates : [];
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) continue;

    const { city, country } = splitLocationName(feature.properties?.name);
    const locationKey = `${city}|${country}`;
    const articles = articlesFromHtml(feature.properties?.html).slice(0, ARTICLES_PER_LOCATION);

    for (const article of articles) {
      if (items.length >= CATEGORY_LIMIT || seenUrls.has(article.url)) break;
      seenUrls.add(article.url);

      items.push({
        title: article.title,
        summary: `Reported near ${city}${country && country !== city ? `, ${country}` : ""} within the last 24 hours.`,
        city,
        country,
        category,
        source: domainOf(article.url),
        url: article.url,
        lat,
        lon,
        createdAt: Date.now(),
        live: true,
        locationKey
      });
    }

    seenLocations.add(locationKey);
    if (items.length >= CATEGORY_LIMIT) break;
  }

  return items;
}

export async function fetchLiveNews() {
  const results = [];
  const errors = [];

  // Run categories concurrently so one slow GDELT query cannot block the whole feed.
  const settled = await Promise.allSettled(
    Object.entries(CATEGORY_QUERIES).map(([category, query]) => fetchCategory(category, query))
  );

  settled.forEach((result, index) => {
    const category = Object.keys(CATEGORY_QUERIES)[index];
    if (result.status === "fulfilled") results.push(...result.value);
    else errors.push(`${category}: ${result.reason?.message || "request failed"}`);
  });

  // Deduplicate the same article appearing in several topical queries.
  const unique = [];
  const seen = new Set();
  for (const item of results) {
    const key = item.url || `${item.title}|${item.city}|${item.country}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
    if (unique.length >= MAX_TOTAL) break;
  }

  // The client doesn't need this internal helper field.
  return {
    items: unique.map(({ locationKey, ...item }) => item),
    errors,
    fetchedAt: Date.now()
  };
}
