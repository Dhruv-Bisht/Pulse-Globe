import { getLiveNews } from '../../../lib/live-news';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const VERSION = 'vercel-gdelt-v7';

export async function GET() {
  const started = Date.now();
  const { items, diagnostics } = await getLiveNews();
  return Response.json(
    { version: VERSION, items, mode: 'gdelt', diagnostics, updatedAt: Date.now(), elapsedMs: Date.now() - started },
    { headers: { 'Cache-Control': 's-maxage=900, stale-while-revalidate=60', 'X-Pulse-Globe-Version': VERSION } }
  );
}

export async function POST() {
  return Response.json({ version: VERSION, error: 'POST is disabled. News is fetched live from GDELT.' }, { status: 405 });
}
