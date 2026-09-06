const CATEGORY_QUERIES = {
  World: 'government OR election OR diplomacy OR conflict OR war OR disaster',
  Technology: 'technology OR artificial intelligence OR startup OR software OR semiconductor',
  Business: 'business OR economy OR markets OR trade OR earnings OR finance',
  Climate: 'climate OR renewable energy OR emissions OR drought OR wildfire OR flood',
  Science: 'science OR research OR space OR discovery OR NASA',
  Health: 'health OR medicine OR outbreak OR hospital OR vaccine'
};

const GDELT_BASE = 'https://api.gdeltproject.org/api/v2/geo/geo';
const MAX_PER_CATEGORY = 14;
const TIMESpan = '1440';

function decodeHtml(value = '') {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function articlesFromHtml(html) {
  if (!html) return [];
  const out = [];
  const re = /<a\s+href="([^"]+)"[^>]*>(.*?)<\/a>/gi;
  let match;
  while ((match = re.exec(html)) && out.length < 5) {
    const url = match[1];
    const title = decodeHtml(match[2]);
    if (url && title) out.push({ url, title });
  }
  return out;
}

function locationParts(name = '') {
  const parts = name.split(',').map(x => x.trim()).filter(Boolean);
  if (!parts.length) return { city: 'Unknown', country: 'Unknown' };
  return {
    city: parts[0],
    country: parts[parts.length - 1]
  };
}

function hostname(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return 'GDELT'; }
}

function titleKey(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function buildUrl(query) {
  const params = new URLSearchParams({
    query,
    format: 'geojson',
    mode: 'pointdata',
    timespan: TIMESpan,
    maxpoints: String(MAX_PER_CATEGORY)
  });
  return `${GDELT_BASE}?${params}`;
}

async function fetchCategory(category, query) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(buildUrl(query), {
      signal: controller.signal,
      headers: { 'User-Agent': 'Pulse-Globe/3.0' },
      next: { revalidate: 900 }
    });
    if (!response.ok) throw new Error(`GDELT ${response.status}`);
    const geo = await response.json();
    const items = [];

    for (const feature of geo.features || []) {
      const coords = feature.geometry?.coordinates;
      const lon = Number(coords?.[0]);
      const lat = Number(coords?.[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) continue;

      const articles = articlesFromHtml(feature.properties?.html);
      const { city, country } = locationParts(feature.properties?.name);
      for (const article of articles) {
        items.push({
          id: `${category}-${lat}-${lon}-${titleKey(article.title).slice(0, 80)}`,
          title: article.title,
          summary: `Reported near ${city}${country !== city ? `, ${country}` : ''}. Open the original article for full coverage.`,
          city,
          country,
          category,
          source: hostname(article.url),
          url: article.url,
          lat,
          lon,
          createdAt: Date.now()
        });
      }
    }
    return items;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getLiveNews() {
  const results = await Promise.allSettled(
    Object.entries(CATEGORY_QUERIES).map(([category, query]) => fetchCategory(category, query))
  );

  const all = [];
  results.forEach(result => {
    if (result.status === 'fulfilled') all.push(...result.value);
  });

  const seen = new Set();
  const deduped = all.filter(item => {
    const key = titleKey(item.title) || `${item.lat}:${item.lon}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Stable ordering keeps marker rendering from jumping around between refreshes.
  deduped.sort((a, b) => a.title.localeCompare(b.title));
  return deduped.slice(0, 100);
}
