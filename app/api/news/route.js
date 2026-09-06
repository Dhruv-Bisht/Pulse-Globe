import { getLiveNews } from '../../../lib/live-news';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 15;

const VERSION = 'vercel-gdelt-v4';

export async function GET() {
  try {
    const items = await getLiveNews();
    return Response.json(
      { version: VERSION, items, mode: 'gdelt', updatedAt: Date.now() },
      { headers: { 'Cache-Control': 'no-store', 'X-Pulse-Globe-Version': VERSION } }
    );
  } catch (error) {
    console.error('GET /api/news failed:', error);
    return Response.json(
      { version: VERSION, items: [], mode: 'error', error: 'Live news provider unavailable' },
      { status: 503, headers: { 'Cache-Control': 'no-store', 'X-Pulse-Globe-Version': VERSION } }
    );
  }
}

export async function POST() {
  return Response.json(
    { version: VERSION, error: 'POST is disabled. News is fetched live from GDELT.' },
    { status: 405 }
  );
}
