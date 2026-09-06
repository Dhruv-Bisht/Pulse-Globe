const target = new URL(process.env.PULSE_GLOBE_URL || "http://localhost:3000");
const transport = target.protocol === "https:" ? require("https") : require("http");

const stories = [
  ["Sample: Bengaluru technology update", "A demo story for testing the Pulse Globe feed.", "Bengaluru", "India", "Technology", 12.9716, 77.5946],
  ["Sample: European climate update", "A demo story for testing European marker placement.", "Berlin", "Germany", "Climate", 52.52, 13.405],
  ["Sample: North American market update", "A demo story for testing North American marker placement.", "New York", "United States", "Business", 40.7128, -74.006],
  ["Sample: East Asia technology update", "A demo story for testing East Asian marker placement.", "Tokyo", "Japan", "Technology", 35.6762, 139.6503]
];

function post(story) {
  return new Promise((resolve, reject) => {
    const [title, summary, city, country, category, lat, lon] = story;
    const body = JSON.stringify({ title, summary, city, country, category, source: "Pulse Globe Seed", lat, lon });
    const req = transport.request({
      hostname: target.hostname,
      port: target.port || (target.protocol === "https:" ? 443 : 80),
      path: "/api/news",
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body), "x-api-key": process.env.API_SECRET || "" }
    }, res => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => res.statusCode >= 200 && res.statusCode < 300 ? resolve(data) : reject(new Error(`${res.statusCode}: ${data}`)));
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  for (const story of stories) {
    await post(story);
    console.log("Seeded:", story[0]);
  }
})().catch(err => { console.error(err); process.exit(1); });