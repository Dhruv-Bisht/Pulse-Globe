const CATEGORY_QUERIES = {
  World: '(government OR election OR diplomacy OR conflict OR war OR disaster)',
  Technology: '(technology OR artificial intelligence OR startup OR software OR semiconductor)',
  Business: '(business OR economy OR markets OR trade OR earnings OR finance)',
  Climate: '(climate OR renewable energy OR emissions OR drought OR wildfire OR flood)',
  Science: '(science OR research OR space OR discovery OR NASA)',
  Health: '(health OR medicine OR outbreak OR hospital OR vaccine)'
};

const GDELT_BASE = 'https://api.gdeltproject.org/api/v2/geo/geo';
const MAX_PER_CATEGORY = 14;

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
  if (!html || typeof html !== 'string') return [];
  const normalized = decodeHtml(html);
  const out = [];
  const re = /<a\b[^>]*\bhref\s*=\s*[\"']([^\"']+)[\"'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = re.exec(normalized)) && out.length < 5) {
    const url = match[1].trim();
    const title = decodeHtml(match[2]);
    if (url && /^https?:\/\//i.test(url) && title) out.push({ url, title });
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
    format: 'GeoJSON',
    mode: 'PointData',
    timespan: '24H',
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
    if (!geo || !Array.isArray(geo.features)) {
      throw new Error(`GDELT returned invalid GeoJSON for ${category}`);
    }
    const items = [];
    let featureCount = 0;

    featureCount = geo.features.length;
    for (const feature of geo.features || []) {
      const coords = feature.geometry?.coordinates;
      const lon = Number(coords?.[0]);
      const lat = Number(coords?.[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) continue;

      const properties = feature.properties || {};
      const articles = articlesFromHtml(properties.html || properties.HTML || properties.popup || '');
      const { city, country } = locationParts(properties.name || properties.location || '');
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
    return { items, featureCount };
  } finally {
    clearTimeout(timeout);
  }
}

export async function getLiveNews() {
  const results = await Promise.allSettled(
    Object.entries(CATEGORY_QUERIES).map(([category, query]) => fetchCategory(category, query))
  );

  const all = [];
  const diagnostics = [];

  results.forEach((result, index) => {
    const category = Object.keys(CATEGORY_QUERIES)[index];
    if (result.status === 'fulfilled') {
      all.push(...result.value.items);
      diagnostics.push({
        category,
        status: 'ok',
        features: result.value.featureCount,
        articles: result.value.items.length
      });
    } else {
      diagnostics.push({
        category,
        status: 'error',
        error: result.reason?.message || String(result.reason)
      });
    }
  });

  const seen = new Set();
  const deduped = all.filter(item => {
    const key = titleKey(item.title) || `${item.lat}:${item.lon}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  deduped.sort((a, b) => a.title.localeCompare(b.title));
  return { items: deduped.slice(0, 100), diagnostics };
}
