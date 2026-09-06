import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { listActiveNews, putNewsItem } from "@/lib/dynamo";
import { findCity, CATEGORIES } from "@/lib/cities";

// Force the Node.js runtime (not Edge) — the AWS SDK needs Node APIs.
export const runtime = "nodejs";
// Never cache: viewers should always get the current, still-live set.
export const dynamic = "force-dynamic";

function checkAuth(req) {
  const key = req.headers.get("x-api-key");
  return key && process.env.API_SECRET && key === process.env.API_SECRET;
}

export async function GET() {
  try {
    const items = await listActiveNews();
    return NextResponse.json({ items });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load news" }, { status: 500 });
  }
}

export async function POST(req) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title = String(body.title || "").trim().slice(0, 140);
  const gist = String(body.gist || "").trim().slice(0, 600);
  const category = CATEGORIES[body.category] ? body.category : null;
  const city = findCity(body.city);
  const timestamp = body.timestamp ? Number(body.timestamp) : Date.now();

  if (!title || !gist) {
    return NextResponse.json({ error: "title and gist are required" }, { status: 400 });
  }
  if (!category) {
    return NextResponse.json(
      { error: `category must be one of: ${Object.keys(CATEGORIES).join(", ")}` },
      { status: 400 }
    );
  }
  if (!city) {
    return NextResponse.json(
      { error: "city must match a known city name — see lib/cities.js for the list" },
      { status: 400 }
    );
  }
  if (!Number.isFinite(timestamp)) {
    return NextResponse.json({ error: "timestamp must be a unix ms number" }, { status: 400 });
  }

  const item = {
    id: randomUUID(),
    title,
    gist,
    category,
    city: city.name,
    lat: city.lat,
    lon: city.lon,
    timestamp
  };

  try {
    await putNewsItem(item);
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to save news item" }, { status: 500 });
  }
}
