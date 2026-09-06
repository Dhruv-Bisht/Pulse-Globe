const VERSION = 'vercel-gdelt-v7';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json({ ok: true, version: VERSION, provider: 'GDELT', aws: false, geographicMarkers: true });
}
