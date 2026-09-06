const GDELT_GEO_V2 = 'https://api.gdeltproject.org/api/v2/geo/geo';
const GDELT_GKG = 'https://api.gdeltproject.org/api/v1/gkg_geojson';
const GDELT_GAL = 'https://data.gdeltproject.org/gdeltv3/gal/feed.rss';
const VERSION = 'vercel-gdelt-v7';

// Keep the v2 query intentionally short. PointData gives us actual geographic
// coordinates and an article list for each point. GDELT's GEO service can
// occasionally return HTTP 404, so v7 has a legacy geographic fallback below.
const GEO_QUERY = '(government OR election OR conflict OR war OR economy OR technology OR climate OR science OR health)';

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

function stripTags(value = '') {
  return decodeHtml(String(value).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function articlesFromHtml(html) {
  if (!html || typeof html !== 'string') return [];
  const out = [];
  const re = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = re.exec(html)) && out.length < 5) {
    const url = decodeHtml(match[1]).trim();
    const title = stripTags(match[2]);
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
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'GDELT'; }
}

function titleKey(title = '') {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function categorize(title, location, extra = '') {
  const text = `${title} ${location} ${extra}`.toLowerCase();
  for (const [category, words] of CATEGORY_RULES) {
    if (words.some(word => text.includes(word))) return category;
  }
  return 'World';
}

function slugTitle(url, domain) {
  try {
    const path = new URL(url).pathname.split('/').filter(Boolean).pop() || '';
    const words = decodeURIComponent(path).replace(/[-_]+/g, ' ').replace(/\.[a-z0-9]{1,5}$/i, '').trim();
    if (words.length >= 12) return words.slice(0, 140);
  } catch {}
  return `Latest report from ${domain || 'news source'}`;
}

async function fetchJson(url, timeoutMs = 18000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Pulse-Globe/7.0' },
      cache: 'no-store'
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`GDELT HTTP ${response.status}`);
    try { return JSON.parse(text); } catch { throw new Error('GDELT returned non-JSON data'); }
  } finally { clearTimeout(timer); }
}

function buildV2Url() {
  const params = new URLSearchParams({
    query: GEO_QUERY,
    mode: 'PointData',
    format: 'GeoJSON',
    timespan: '24h',
    maxpoints: '80'
  });
  return `${GDELT_GEO_V2}?${params}`;
}

function parseV2(geo) {
  const items = [];
  for (const feature of Array.isArray(geo?.features) ? geo.features : []) {
    const coords = feature.geometry?.coordinates;
    const lon = Number(coords?.[0]);
    const lat = Number(coords?.[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const p = feature.properties || {};
    const { city, country, location } = locationParts(p.name || p.location || 'Unknown');
    const html = p.html || p.HTML || '';
    for (const article of articlesFromHtml(html)) {
      items.push({
        title: article.title, url: article.url, source: hostname(article.url),
        city, country, location, lat, lon,
        category: categorize(article.title, location, html),
        summary: `News reported in ${location}.`, createdAt: Date.now(), provider: 'GDELT'
      });
    }
  }
  return items;
}

async function fetchGalTitles() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(GDELT_GAL, { signal: controller.signal, headers: { 'User-Agent': 'Pulse-Globe/7.0' }, cache: 'no-store' });
    if (!response.ok) return new Map();
    const xml = await response.text();
    const map = new Map();
    const itemRe = /<item>([\s\S]*?)<\/item>/gi;
    let m;
    while ((m = itemRe.exec(xml))) {
      const block = m[1];
      const link = block.match(/<link>([\s\S]*?)<\/link>/i)?.[1];
      const title = block.match(/<title>([\s\S]*?)<\/title>/i)?.[1];
      if (link && title) map.set(decodeHtml(stripTags(link)).trim(), stripTags(title));
    }
    return map;
  } catch { return new Map(); }
  finally { clearTimeout(timer); }
}

async function fetchLegacyGkg() {
  const started = Date.now();
  const params = new URLSearchParams({
    QUERY: '',
    OUTPUTFIELDS: 'url,name,domain,geores,tone,themes,names',
    MAXROWS: '800',
    TIMESPAN: '60'
  });
  const geo = await fetchJson(`${GDELT_GKG}?${params}`, 20000);
  const titles = await fetchGalTitles();
  const items = [];
  for (const feature of Array.isArray(geo?.features) ? geo.features : []) {
    const coords = feature.geometry?.coordinates;
    const lon = Number(coords?.[0]);
    const lat = Number(coords?.[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const p = feature.properties || {};
    const url = p.url || '';
    if (!url) continue;
    const { city, country, location } = locationParts(p.name || 'Unknown');
    const domain = p.domain || hostname(url);
    const title = titles.get(url) || slugTitle(url, domain);
    items.push({
      title, url, source: domain, city, country, location, lat, lon,
      category: categorize(title, location, `${p.themes || ''} ${p.names || ''}`),
      summary: `News reported in ${location}.`,
      createdAt: Date.now(), provider: 'GDELT GKG'
    });
  }
  return { items, elapsedMs: Date.now() - started };
}

function dedupe(items) {
  const seen = new Set();
  return items.filter(item => {
    const key = titleKey(item.title) || `${item.lat}:${item.lon}:${item.url}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).slice(0, 100);
}

export async function getLiveNews() {
  const started = Date.now();
  try {
    const geo = await fetchJson(buildV2Url(), 18000);
    const items = dedupe(parseV2(geo));
    if (items.length) return {
      items, diagnostics: [{ provider: 'GDELT GEO 2.0', status: 'ok', features: geo.features?.length || 0, articlesReturned: items.length, elapsedMs: Date.now() - started }]
    };
    return { items: [], diagnostics: [{ provider: 'GDELT GEO 2.0', status: 'ok', features: geo.features?.length || 0, articlesReturned: 0, elapsedMs: Date.now() - started }] };
  } catch (primaryError) {
    try {
      const fallback = await fetchLegacyGkg();
      const items = dedupe(fallback.items);
      return {
        items,
        diagnostics: [{ provider: 'GDELT GEO 2.0', status: 'fallback', error: primaryError.message }, { provider: 'GDELT GKG GeoJSON', status: 'ok', features: fallback.items.length, articlesReturned: items.length, elapsedMs: Date.now() - started }]
      };
    } catch (fallbackError) {
      return {
        items: [],
        diagnostics: [
          { provider: 'GDELT GEO 2.0', status: 'error', error: primaryError.message },
          { provider: 'GDELT GKG GeoJSON', status: 'error', error: fallbackError.message },
          { status: 'failed', elapsedMs: Date.now() - started }
        ]
      };
    }
  }
}

export { VERSION };
