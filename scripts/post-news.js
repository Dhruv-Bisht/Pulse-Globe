const target = new URL(process.env.PULSE_GLOBE_URL || "http://localhost:3000");
const transport = target.protocol === "https:" ? require("https") : require("http");

const payload = {
  title: process.env.NEWS_TITLE || "Example story",
  summary: process.env.NEWS_SUMMARY || "Example story summary.",
  city: process.env.NEWS_CITY || "Bengaluru",
  country: process.env.NEWS_COUNTRY || "India",
  category: process.env.NEWS_CATEGORY || "Technology",
  source: process.env.NEWS_SOURCE || "Manual",
  lat: Number(process.env.NEWS_LAT || 12.9716),
  lon: Number(process.env.NEWS_LON || 77.5946)
};

const body = JSON.stringify(payload);
const req = transport.request({
  hostname: target.hostname,
  port: target.port || (target.protocol === "https:" ? 443 : 80),
  path: "/api/news",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
    "x-api-key": process.env.API_SECRET || ""
  }
}, res => {
  let data = "";
  res.on("data", chunk => data += chunk);
  res.on("end", () => {
    console.log(res.statusCode, data);
    process.exit(res.statusCode >= 200 && res.statusCode < 300 ? 0 : 1);
  });
});

req.on("error", err => { console.error(err); process.exit(1); });
req.write(body);
req.end();