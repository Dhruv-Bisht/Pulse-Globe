import { NextResponse } from "next/server";
import { deleteNews } from "../../../../lib/dynamo";
import crypto from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request) {
  const expected = process.env.API_SECRET;
  const provided = request.headers.get("x-api-key");
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function DELETE(request, { params }) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await deleteNews(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/news failed", error);
    return NextResponse.json({ error: "Unable to delete news item" }, { status: 500 });
  }
}