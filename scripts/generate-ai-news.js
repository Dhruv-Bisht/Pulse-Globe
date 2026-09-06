// Optional helper: asks Claude to draft a batch of plausible tech-news items
// and posts each one to the Pulse API. This is a convenience for YOU to seed
// or supplement the feed — it is not exposed to site visitors in any way.
// Review drafts before running this against production if accuracy matters;
// treat the output as a starting point, not verified reporting.
//
// Usage:
//   ANTHROPIC_API_KEY=... API_SECRET=... BASE_URL=https://your-domain \
//     node scripts/generate-ai-news.js

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const API_SECRET = process.env.API_SECRET;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!API_SECRET || !ANTHROPIC_API_KEY) {
  console.error("Set both API_SECRET and ANTHROPIC_API_KEY in the environment.");
  process.exit(1);
}

const CATEGORY_NAMES = ["AI", "Hardware", "Software", "Security", "Business", "Space"];

async function draftItems() {
  // dynamic import: lib/cities.js is an ES module, this script runs as CommonJS
  const { CITIES } = await import("../lib/cities.js");
  const cityNames = CITIES.map((c) => c.name).join(", ");
  const prompt =
    "Generate 6 short, plausible technology news items for a demo feed. " +
    "Respond with ONLY a JSON array, no markdown fences, no commentary. " +
    'Each element: "title" (under 12 words), "gist" (2-3 factual-sounding sentences), ' +
    `"city" (exactly one of: ${cityNames}), "category" (exactly one of: ${CATEGORY_NAMES.join(", ")}). ` +
    "These are placeholder demo items, not verified reporting.";

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }]
    })
  });
  const data = await res.json();
  const text = (data.content || []).map((b) => b.text || "").join("\n");
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

async function postItem(item) {
  const res = await fetch(`${BASE_URL}/api/news`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": API_SECRET },
    body: JSON.stringify(item)
  });
  const data = await res.json();
  if (!res.ok) {
    console.error("Failed to post:", item.title, "-", data.error);
  } else {
    console.log("Posted:", data.item.title);
  }
}

async function main() {
  const drafts = await draftItems();
  for (const d of drafts) {
    if (!d.title || !d.gist || !d.city || !d.category) continue;
    await postItem(d);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
