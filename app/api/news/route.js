import { NextResponse } from "next/server";
import { listRecentNews, putNews } from "../../../lib/dynamo";
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

export async function GET() {
  try {
    const items = await listRecentNews();
    return NextResponse.json({ items });
  } catch (error) {
    console.error("GET /api/news failed", error);
    return NextResponse.json({ error: "News service unavailable" }, { status: 500 });
  }
}

export async function POST(request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const title = String(body.title || "").trim();
    const summary = String(body.summary || "").trim();
    const city = String(body.city || "").trim();
    const category = String(body.category || "General").trim();
    const lat = Number(body.lat);
    const lon = Number(body.lon);

    if (!title || !summary || !city || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      return NextResponse.json({ error: "title, summary, city, lat and lon are required" }, { status: 400 });
    }

    const item = {
      id: crypto.randomUUID(),
      title: title.slice(0, 200),
      summary: summary.slice(0, 1000),
      city: city.slice(0, 100),
      category: category.slice(0, 60),
      lat: Math.max(-90, Math.min(90, lat)),
      lon: Math.max(-180, Math.min(180, lon)),
      createdAt: Date.now()
    };

    await putNews(item);
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error("POST /api/news failed", error);
    return NextResponse.json({ error: "Unable to create news item" }, { status: 500 });
  }
}