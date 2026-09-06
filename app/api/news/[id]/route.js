// Vercel-only build: news is read-only and fetched from GDELT via /api/news.
// This route intentionally has no AWS/DynamoDB dependency.

export const runtime = 'nodejs';

export async function DELETE() {
  return Response.json(
    { error: 'News deletion is not available in the Vercel-only deployment.' },
    { status: 405 }
  );
}
