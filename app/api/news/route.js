import { randomUUID, timingSafeEqual } from "node:crypto";
import { listRecentNews, putNews } from "../../../lib/dynamo";
import { demoNews } from "../../../lib/demo-news";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validSecret(request) {
  const supplied = request.headers.get("x-api-key") || "";
  const expected = process.env.API_SECRET || "";
  if (!expected || !supplied) return false;
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function clean(body) {
  return {
    title: String(body.title || "").trim(),
    summary: String(body.summary || "").trim(),
    city: String(body.city || "").trim(),
    country: String(body.country || "").trim(),
    category: String(body.category || "World").trim(),
    source: String(body.source || "Unknown").trim(),
    lat: Number(body.lat),
    lon: Number(body.lon)
  };
}

export async function GET() {
  try {
    const items = await listRecentNews();
    if (items.length > 0) {
      return Response.json({ items, mode: "dynamodb" }, { headers: { "Cache-Control": "no-store" } });
    }
    if (process.env.DEMO_MODE === "true") {
      return Response.json({ items: demoNews, mode: "demo" }, { headers: { "Cache-Control": "no-store" } });
    }
    return Response.json({ items: [], mode: "dynamodb" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET /api/news failed:", error);
    if (process.env.DEMO_MODE === "true") {
      return Response.json({ items: demoNews, mode: "demo-fallback" }, { headers: { "Cache-Control": "no-store" } });
    }
    return Response.json({ error: "News service unavailable" }, { status: 503 });
  }
}

export async function POST(request) {
  if (!validSecret(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = clean(await request.json());
    const required = [body.title, body.summary, body.city];
    if (required.some(v => !v) || !Number.isFinite(body.lat) || !Number.isFinite(body.lon)) {
      return Response.json({ error: "Invalid news payload" }, { status: 400 });
    }
    if (body.lat < -90 || body.lat > 90 || body.lon < -180 || body.lon > 180) {
      return Response.json({ error: "Invalid coordinates" }, { status: 400 });
    }

    const createdAt = Date.now();
    const item = {
      pk: "NEWS",
      id: randomUUID(),
      ...body,
      createdAt,
      expiresAt: Math.floor((createdAt + 48 * 60 * 60 * 1000) / 1000)
    };
    await putNews(item);
    return Response.json(item, { status: 201 });
  } catch (error) {
    console.error("POST /api/news failed:", error);
    return Response.json({ error: "Could not create news item" }, { status: 500 });
  }
}