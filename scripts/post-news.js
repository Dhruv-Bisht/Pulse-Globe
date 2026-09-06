// Posts one news item to the Pulse API.
//
// Usage:
//   API_SECRET=... BASE_URL=https://your-domain node scripts/post-news.js \
//     "Headline goes here" \
//     "One or two sentence gist of what happened." \
//     "Tokyo" \
//     "AI"
//
// Env vars:
//   BASE_URL   Where the app is running (default http://localhost:3000)
//   API_SECRET Must match the API_SECRET set on the server

const [, , title, gist, city, category] = process.argv;

if (!title || !gist || !city || !category) {
  console.error(
    'Usage: node scripts/post-news.js "<title>" "<gist>" "<city>" "<category>"'
  );
  console.error("category must be one of: AI, Hardware, Software, Security, Business, Space");
  process.exit(1);
}

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const API_SECRET = process.env.API_SECRET;

if (!API_SECRET) {
  console.error("Set API_SECRET in the environment before running this script.");
  process.exit(1);
}

async function main() {
  const res = await fetch(`${BASE_URL}/api/news`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_SECRET
    },
    body: JSON.stringify({ title, gist, city, category })
  });
  const data = await res.json();
  if (!res.ok) {
    console.error("Failed:", data.error || res.statusText);
    process.exit(1);
  }
  console.log("Posted:", data.item);
}

main();
