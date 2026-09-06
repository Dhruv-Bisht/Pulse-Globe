export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FETCH_TIMEOUT_MS = 7000;
const MAX_HTML_CHARS = 500000;

function isBlockedHost(hostname) {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local')) return true;
  if (/^127\./.test(h) || h === '0.0.0.0' || h === '::1') return true;
  if (/^10\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(h)) return true;
  if (/^169\.254\./.test(h)) return true;
  return false;
}

function decodeHtml(value = '') {
  return value
    .replace(/&amp;/gi, '&').replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'").replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function stripTags(value = '') {
  return decodeHtml(String(value).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

// Matches <meta ...> tags regardless of whether `content` comes before or
// after the property/name attribute, and regardless of quote style.
function findMeta(html, keys) {
  for (const key of keys) {
    const patterns = [
      new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']*)["']`, 'i'),
      new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${key}["']`, 'i')
    ];
    for (const re of patterns) {
      const m = html.match(re);
      if (m && m[1]) return decodeHtml(m[1]).trim();
    }
  }
  return '';
}

function findFirstParagraph(html) {
  const bodyMatch = html.match(/<body[\s\S]*?>([\s\S]*)<\/body>/i);
  const body = bodyMatch ? bodyMatch[1] : html;
  const cleaned = body
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ');
  const paras = cleaned.match(/<p\b[^>]*>([\s\S]*?)<\/p>/gi) || [];
  for (const p of paras) {
    const text = stripTags(p);
    if (text.length >= 60) return text.slice(0, 600);
  }
  return '';
}

function findPublishedTime(html) {
  const meta = findMeta(html, ['article:published_time', 'og:published_time', 'datePublished', 'date']);
  if (meta) return meta;
  const timeTag = html.match(/<time[^>]+datetime=["']([^"']+)["']/i);
  return timeTag ? timeTag[1] : '';
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get('url') || '';

  let parsed;
  try {
    parsed = new URL(target);
  } catch {
    return Response.json({ ok: false, error: 'Invalid URL' }, { status: 400 });
  }
  if (!/^https?:$/.test(parsed.protocol) || isBlockedHost(parsed.hostname)) {
    return Response.json({ ok: false, error: 'URL not allowed' }, { status: 400 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(parsed.toString(), {
      signal: controller.signal,
      redirect: 'follow',
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PulseGlobeBot/1.0; +https://pulseglobe.example/bot)',
        Accept: 'text/html,application/xhtml+xml'
      }
    });
    if (!response.ok) {
      return Response.json({ ok: false, error: `Article responded with HTTP ${response.status}` }, { status: 200 });
    }
    let html = await response.text();
    if (html.length > MAX_HTML_CHARS) html = html.slice(0, MAX_HTML_CHARS);

    const title = findMeta(html, ['og:title', 'twitter:title']) || (html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ? stripTags(html.match(/<title>([\s\S]*?)<\/title>/i)[1]) : '');
    const description = findMeta(html, ['og:description', 'twitter:description', 'description']);
    const image = findMeta(html, ['og:image', 'twitter:image']);
    const siteName = findMeta(html, ['og:site_name']);
    const publishedAt = findPublishedTime(html);
    const excerpt = description || findFirstParagraph(html);

    return Response.json({
      ok: true,
      title: title || null,
      description: description || null,
      excerpt: excerpt || null,
      image: image || null,
      siteName: siteName || null,
      publishedAt: publishedAt || null,
      domain: parsed.hostname.replace(/^www\./, '')
    });
  } catch (error) {
    return Response.json({ ok: false, error: error.name === 'AbortError' ? 'Article took too long to load' : error.message }, { status: 200 });
  } finally {
    clearTimeout(timer);
  }
}
