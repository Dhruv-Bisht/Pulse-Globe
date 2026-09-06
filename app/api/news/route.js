import { getLiveNews } from '../../../lib/live-news';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 15;

export async function GET() {
  try {
    const items = await getLiveNews();
    return Response.json(
      { items, mode: 'gdelt', updatedAt: Date.now() },
      { headers: { 'Cache-Control': 's-maxage=900, stale-while-revalidate=60' } }
    );
  } catch (error) {
    console.error('GET /api/news failed:', error);
    return Response.json(
      { items: [], mode: 'error', error: 'Live news provider unavailable' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

export async function POST() {
  return Response.json(
    { error: 'POST is disabled in the Vercel-only version. News is fetched live from GDELT.' },
    { status: 405 }
  );
}
