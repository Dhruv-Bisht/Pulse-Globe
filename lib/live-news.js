const GDELT_BASE = 'https://api.gdeltproject.org/api/v2/geo/geo';
const VERSION = 'vercel-gdelt-v6';

// One broad geographic query is intentionally used instead of six parallel
// queries. GDELT PointData gives us the coordinates of each location plus an
// HTML block containing matching articles, which is exactly what the globe needs.
const QUERY = '(government OR election OR diplomacy OR conflict OR war OR disaster OR technology OR artificial intelligence OR startup OR software OR semiconductor OR business OR economy OR markets OR trade OR earnings OR finance OR climate OR renewable energy OR emissions OR drought OR wildfire OR flood OR science OR research OR space OR discovery OR NASA OR health OR medicine OR outbreak OR hospital OR vaccine)';
const MAX_POINTS = 100;

const CATEGORY_RULES = [
  ['Technology', ['artificial intelligence','semiconductor','software','startup','technology','cyber','robot']],
  ['Business', ['business','economy','markets','trade','earnings','finance','bank','company','stock']],
  ['Climate', ['climate','renewable','emissions','drought','wildfire','flood','weather','hurricane','heatwave']],
  ['Science', ['science','research','space','discovery','nasa','astronomy','physics']],
  ['Health', ['health','medicine','outbreak','hospital','vaccine','disease','virus','medical']],
  ['World', ['government','election','diplomacy','conflict','war','disaster','president','minister','politics']]
];

function decodeHtml(value = '') {
  return value
    .replace(/&amp;/gi, '&').replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'").replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

// IMPORTANT: parse the anchor tags BEFORE stripping HTML. The previous version
// stripped the tags first, which destroyed the article links.
function articlesFromHtml(html) {
  if (!html || typeof html !== 'string') return [];
  const out = [];
  const re = /<a\b[^>]*\bhref\s*=\s*[\"']([^\"']+)[\"'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = re.exec(html)) && out.length < 5) {
    const url = decodeHtml(match[1]).trim();
    const title = decodeHtml(match[2].replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
    if (url && /^https?:\/\//i.test(url) && title) out.push({ url, title });
  }
  return out;
}

function locationParts(name = '') {
  const parts = String(name).split(',').map(x => x.trim()).filter(Boolean);
  if (!parts.length) return { city: 'Unknown', country: 'Unknown', location: 'Unknown' };
  return { city: parts[0], country: parts.length > 1 ? parts[parts.length - 1] : 'Unknown', location: parts.join(', ') };
}

function hostname(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return 'GDELT'; }
}

function titleKey(title = '') {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function categorize(title, location, html) {
  const text = `${title} ${location} ${html}`.toLowerCase();
  for (const [category, words] of CATEGORY_RULES) {
    if (words.some(word => text.includes(word))) return category;
  }
  return 'World';
}

function buildUrl() {
  const params = new URLSearchParams({
    query: QUERY,
    format: 'GeoJSON',
    mode: 'PointData',
    timespan: '24h',
    maxpoints: String(MAX_POINTS),
    geores: '2',
    sortby: 'Date'
  });
  return `${GDELT_BASE}?${params}`;
}

async function fetchGdelt() {
  const started = Date.now();
  const controller = new AbortController();
  // One request instead of six 8-second requests. Vercel gets enough time to
  // receive a global geographic response while still preventing a hung call.
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch(buildUrl(), {
      signal: controller.signal,
      headers: { 'User-Agent': 'Pulse-Globe/6.0' },
      cache: 'no-store'
    });
    if (!response.ok) throw new Error(`GDELT HTTP ${response.status}`);
    const geo = await response.json();
    if (!geo || !Array.isArray(geo.features)) throw new Error('GDELT returned invalid GeoJSON');

    const items = [];
    for (const feature of geo.features) {
      const coords = feature.geometry?.coordinates;
      const lon = Number(coords?.[0]);
      const lat = Number(coords?.[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) continue;

      const properties = feature.properties || {};
      const locationName = properties.name || properties.location || properties.NAME || 'Unknown';
      const { city, country, location } = locationParts(locationName);
      const html = properties.html || properties.HTML || properties.popup || '';
      const articles = articlesFromHtml(html);

      for (const article of articles) {
        items.push({
          id: `gdelt-${lat}-${lon}-${titleKey(article.title).slice(0, 80)}`,
          title: article.title,
          summary: `News reported in ${location}.`,
          city, country, location,
          category: categorize(article.title, location, html),
          source: hostname(article.url),
          url: article.url,
          lat, lon,
          createdAt: Date.now(),
          provider: 'GDELT'
        });
      }
    }

    const seen = new Set();
    const deduped = items.filter(item => {
      const key = titleKey(item.title) || `${item.lat}:${item.lon}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return {
      items: deduped.slice(0, 100),
      diagnostics: [{
        status: 'ok',
        features: geo.features.length,
        articlesFound: items.length,
        articlesReturned: deduped.length,
        elapsedMs: Date.now() - started
      }]
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function getLiveNews() {
  try {
    return await fetchGdelt();
  } catch (error) {
    return {
      items: [],
      diagnostics: [{
        status: 'error',
        error: error?.name === 'AbortError' ? 'GDELT request timed out after 25 seconds' : (error?.message || String(error))
      }]
    };
  }
}

export { VERSION };
