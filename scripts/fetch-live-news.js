import { fetchLiveNews } from "../lib/live-news.js";

const target = new URL(process.env.PULSE_GLOBE_URL || "http://localhost:3000");
const API_SECRET = process.env.API_SECRET || "";

if (!API_SECRET) {
  console.error("Set API_SECRET before running the ingestion script.");
  process.exit(1);
}

async function postItem(item) {
  const response = await fetch(new URL("/api/news", target), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_SECRET
    },
    body: JSON.stringify(item)
  });

  const text = await response.text();
  if (!response.ok) {
    console.warn(`POST failed (${response.status}): ${item.title} — ${text}`);
    return false;
  }
  return true;
}

const live = await fetchLiveNews();
let posted = 0;
for (const item of live.items) {
  if (await postItem(item)) posted++;
}

console.log(`Fetched ${live.items.length} live stories. Posted ${posted}.`);
if (live.errors.length) console.warn("Provider warnings:", live.errors);
