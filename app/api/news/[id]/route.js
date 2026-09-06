import { NextResponse } from "next/server";
import { deleteNewsItem } from "@/lib/dynamo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function checkAuth(req) {
  const key = req.headers.get("x-api-key");
  return key && process.env.API_SECRET && key === process.env.API_SECRET;
}

export async function DELETE(req, { params }) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await deleteNewsItem(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to delete news item" }, { status: 500 });
  }
}
