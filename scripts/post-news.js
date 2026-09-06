const https = require("https");
const { randomUUID } = require("crypto");

const [, , title, summary, city, category = "General", lat = "0", lon = "0"] = process.argv;
const secret = process.env.API_SECRET;
const url = process.env.PULSE_GLOBE_URL || "http://localhost:3000";

if (!title || !summary || !city || !secret) {
  console.error('Usage: API_SECRET=... PULSE_GLOBE_URL=https://... node scripts/post-news.js "Headline" "Summary" "Tokyo" "AI" 35.68 139.69');
  process.exit(1);
}

const target = new URL("/api/news", url);
const payload = JSON.stringify({ id: randomUUID(), title, summary, city, category, lat: Number(lat), lon: Number(lon) });

const req = https.request({
  protocol: target.protocol,
  hostname: target.hostname,
  port: target.port || 443,
  path: target.pathname,
  method: "POST",
  headers: {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(payload),
    "x-api-key": secret
  }
}, res => {
  let body = "";
  res.on("data", chunk => body += chunk);
  res.on("end", () => {
    console.log(`HTTP ${res.statusCode}`);
    console.log(body);
    process.exit(res.statusCode >= 200 && res.statusCode < 300 ? 0 : 1);
  });
});

req.on("error", error => {
  console.error(error);
  process.exit(1);
});
req.write(payload);
req.end();