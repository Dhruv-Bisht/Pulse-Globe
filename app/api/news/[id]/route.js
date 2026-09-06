import { timingSafeEqual } from "node:crypto";
import { deleteNews } from "../../../../lib/dynamo";

export const runtime = "nodejs";

function validSecret(request) {
  const supplied = request.headers.get("x-api-key") || "";
  const expected = process.env.API_SECRET || "";
  if (!expected || !supplied) return false;
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function DELETE(request, { params }) {
  if (!validSecret(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await deleteNews(params.id);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/news failed:", error);
    return Response.json({ error: "Could not delete news item" }, { status: 500 });
  }
}