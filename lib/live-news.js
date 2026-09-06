import { resolveCountryCentroid } from './country-centroids';
import { rangeByKey } from './time-ranges';

const GDELT_GEO_V2 = 'https://api.gdeltproject.org/api/v2/geo/geo';
const GDELT_DOC_V2 = 'https://api.gdeltproject.org/api/v2/doc/doc';
const GDELT_GKG = 'https://api.gdeltproject.org/api/v1/gkg_geojson';
const GDELT_GAL = 'https://data.gdeltproject.org/gdeltv3/gal/feed.rss';
const VERSION = 'vercel-gdelt-v8';

// Keep the query intentionally short. PointData gives us actual geographic
// coordinates and an article list for each point. GDELT's GEO service can
// occasionally return HTTP 404, so there's a legacy geographic fallback below.
const GEO_QUERY = '(government OR election OR conflict OR war OR economy OR technology OR climate OR science OR health)';

const CATEGORY_RULES = [
  ['Technology', ['artificial intelligence','semiconductor','software','startup','technology','cyber','robot','app ','chip','ai ']],
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

// Small deterministic hash so the same article always jitters to the same
// spot (avoids markers jumping around between refreshes for the same story).
function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return h;
}

// Country-level results (used for time ranges GEO 2.0 can't reach) all land
// on the same centroid point. Spread them out a little so a busy country
// doesn't render as a single stacked pin.
function jitterFromString(lat, lon, seed) {
  const h = hashString(seed);
  const a = ((h & 0xffff) / 0xffff) * Math.PI * 2;
  const r = (((h >> 16) & 0xffff) / 0xffff) * 3.2;
  return { lat: lat + Math.sin(a) * r, lon: lon + Math.cos(a) * r * 1.4 };
}

async function fetchJson(url, timeoutMs = 18000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Pulse-Globe/8.0' },
      cache: 'no-store'
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`GDELT HTTP ${response.status}`);
    try { return JSON.parse(text); } catch { throw new Error('GDELT returned non-JSON data'); }
  } finally { clearTimeout(timer); }
}

function buildV2Url(timespan) {
  const params = new URLSearchParams({
    query: GEO_QUERY,
    mode: 'PointData',
    format: 'GeoJSON',
    timespan,
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
    const articles = articlesFromHtml(html);
    articles.forEach((article, idx) => {
      const others = articles.filter((_, j) => j !== idx).map(a => ({ title: a.title, url: a.url, source: hostname(a.url) }));
      items.push({
        id: article.url,
        title: article.title, url: article.url, source: hostname(article.url),
        city, country, location, lat, lon,
        category: categorize(article.title, location, html),
        summary: articles.length > 1
          ? `${articles.length} outlets are covering this story from ${location}.`
          : `News reported in ${location}.`,
        createdAt: Date.now(),
        approxTime: true,
        provider: 'GDELT GEO 2.0',
        related: others.slice(0, 4),
        relatedCount: articles.length
      });
    });
  }
  return items;
}

async function fetchGalTitles() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(GDELT_GAL, { signal: controller.signal, headers: { 'User-Agent': 'Pulse-Globe/8.0' }, cache: 'no-store' });
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
      id: url,
      title, url, source: domain, city, country, location, lat, lon,
      category: categorize(title, location, `${p.themes || ''} ${p.names || ''}`),
      summary: `News reported in ${location}.`,
      createdAt: Date.now(),
      approxTime: true,
      provider: 'GDELT GKG',
      related: [],
      relatedCount: 1
    });
  }
  return { items, elapsedMs: Date.now() - started };
}

function parseSeenDate(raw) {
  // GDELT DOC API dates look like 20240102153000 (UTC, YYYYMMDDHHMMSS) or
  // 2024-01-02T15:30:00Z depending on endpoint version. Handle both.
  if (!raw) return Date.now();
  const digits = String(raw).replace(/[^0-9]/g, '');
  if (digits.length >= 14) {
    const y = digits.slice(0, 4), mo = digits.slice(4, 6), d = digits.slice(6, 8);
    const h = digits.slice(8, 10), mi = digits.slice(10, 12), s = digits.slice(12, 14);
    const ts = Date.parse(`${y}-${mo}-${d}T${h}:${mi}:${s}Z`);
    if (Number.isFinite(ts)) return ts;
  }
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function buildDocUrl(timespan, maxrecords = 200) {
  const params = new URLSearchParams({
    query: GEO_QUERY,
    mode: 'artlist',
    format: 'json',
    timespan,
    maxrecords: String(maxrecords),
    sort: 'hybridrel'
  });
  return `${GDELT_DOC_V2}?${params}`;
}

// Used for time ranges beyond what GEO 2.0 can search (>7 days). The DOC 2.0
// API can look back up to a year, but only reports a source *country* per
// article rather than a precise point, so results are placed at a jittered
// country centroid and flagged with `countryLevel: true` so the UI can be
// upfront about the reduced precision.
async function fetchDocByCountry(timespan) {
  const started = Date.now();
  const data = await fetchJson(buildDocUrl(timespan), 25000);
  const list = Array.isArray(data?.articles) ? data.articles : Array.isArray(data) ? data : [];
  const items = [];
  for (const article of list) {
    const countryName = article.sourcecountry || '';
    const centroid = resolveCountryCentroid(countryName);
    if (!centroid) continue;
    const url = article.url || '';
    if (!url) continue;
    const domain = article.domain || hostname(url);
    const title = stripTags(article.title || '') || slugTitle(url, domain);
    const { lat, lon } = jitterFromString(centroid[0], centroid[1], url);
    items.push({
      id: url,
      title, url, source: domain,
      city: countryName || 'Unknown', country: countryName || 'Unknown', location: countryName || 'Unknown',
      lat, lon,
      category: categorize(title, countryName, domain),
      summary: `Reported by ${domain}${countryName ? ` (${countryName})` : ''}.`,
      createdAt: parseSeenDate(article.seendate),
      approxTime: false,
      countryLevel: true,
      image: article.socialimage || null,
      language: article.language || null,
      provider: 'GDELT DOC 2.0',
      related: [],
      relatedCount: 1
    });
  }
  return { items, elapsedMs: Date.now() - started, rawCount: list.length };
}

function dedupe(items) {
  const seen = new Set();
  return items.filter(item => {
    const key = titleKey(item.title) || `${item.lat}:${item.lon}:${item.url}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).slice(0, 220);
}

export async function getLiveNews(rangeKey) {
  const range = rangeByKey(rangeKey);
  const started = Date.now();

  if (range.source === 'doc') {
    try {
      const result = await fetchDocByCountry(range.timespan);
      const items = dedupe(result.items);
      return {
        range: range.key,
        items,
        diagnostics: [{
          provider: 'GDELT DOC 2.0', status: 'ok', timespan: range.timespan,
          articlesReturned: result.rawCount, placedOnMap: items.length, elapsedMs: Date.now() - started
        }]
      };
    } catch (error) {
      return {
        range: range.key,
        items: [],
        diagnostics: [{ provider: 'GDELT DOC 2.0', status: 'error', error: error.message }]
      };
    }
  }

  try {
    const geo = await fetchJson(buildV2Url(range.timespan), 18000);
    const items = dedupe(parseV2(geo));
    if (items.length) return {
      range: range.key,
      items,
      diagnostics: [{ provider: 'GDELT GEO 2.0', status: 'ok', timespan: range.timespan, features: geo.features?.length || 0, articlesReturned: items.length, elapsedMs: Date.now() - started }]
    };
    return {
      range: range.key,
      items: [],
      diagnostics: [{ provider: 'GDELT GEO 2.0', status: 'ok', timespan: range.timespan, features: geo.features?.length || 0, articlesReturned: 0, elapsedMs: Date.now() - started }]
    };
  } catch (primaryError) {
    try {
      const fallback = await fetchLegacyGkg();
      const items = dedupe(fallback.items);
      return {
        range: range.key,
        items,
        diagnostics: [{ provider: 'GDELT GEO 2.0', status: 'fallback', error: primaryError.message }, { provider: 'GDELT GKG GeoJSON', status: 'ok', features: fallback.items.length, articlesReturned: items.length, elapsedMs: Date.now() - started }]
      };
    } catch (fallbackError) {
      return {
        range: range.key,
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
