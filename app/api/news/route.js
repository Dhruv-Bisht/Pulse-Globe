import { getLiveNews } from '../../../lib/live-news';
import { DEFAULT_RANGE_KEY, indexForKey, TIME_RANGES } from '../../../lib/time-ranges';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const VERSION = 'vercel-gdelt-v8';

export async function GET(request) {
  const started = Date.now();
  const { searchParams } = new URL(request.url);
  const requested = searchParams.get('range') || DEFAULT_RANGE_KEY;
  const rangeKey = TIME_RANGES[indexForKey(requested)].key;

  const { items, diagnostics, range } = await getLiveNews(rangeKey);

  // Longer ranges pull from an API that updates far less often than GDELT's
  // ~15 minute GEO cadence, so it's safe (and kinder to GDELT) to cache them
  // longer at the edge.
  const isLongRange = ['1m', '3m', '6m', '1y'].includes(rangeKey);
  const sMaxAge = isLongRange ? 3600 : 900;

  return Response.json(
    { version: VERSION, items, mode: 'gdelt', range, diagnostics, updatedAt: Date.now(), elapsedMs: Date.now() - started },
    { headers: { 'Cache-Control': `s-maxage=${sMaxAge}, stale-while-revalidate=60`, 'X-Pulse-Globe-Version': VERSION } }
  );
}

export async function POST() {
  return Response.json({ version: VERSION, error: 'POST is disabled. News is fetched live from GDELT.' }, { status: 405 });
}
