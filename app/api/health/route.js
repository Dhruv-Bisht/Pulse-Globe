export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json(
    { ok: true, version: 'vercel-gdelt-v5', provider: 'GDELT', aws: false },
    { headers: { 'Cache-Control': 'no-store', 'X-Pulse-Globe-Version': 'vercel-gdelt-v5' } }
  );
}
