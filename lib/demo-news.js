const now = Date.now();

export const demoNews = [
  {
    id: "demo-1",
    pk: "NEWS",
    title: "Sample: Coastal monitoring network expands",
    summary: "Demo story used to verify the globe, marker rendering and read-only news panel before a DynamoDB feed is connected.",
    city: "Singapore",
    country: "Singapore",
    lat: 1.3521,
    lon: 103.8198,
    category: "Technology",
    source: "Pulse Globe Demo",
    createdAt: now - 10 * 60 * 1000,
    expiresAt: Math.floor((now + 23 * 60 * 60 * 1000) / 1000),
    demo: true
  },
  {
    id: "demo-2",
    pk: "NEWS",
    title: "Sample: Renewable energy project enters next phase",
    summary: "Demo story used to verify a second geographic marker and the global feed layout.",
    city: "Copenhagen",
    country: "Denmark",
    lat: 55.6761,
    lon: 12.5683,
    category: "Climate",
    source: "Pulse Globe Demo",
    createdAt: now - 35 * 60 * 1000,
    expiresAt: Math.floor((now + 22 * 60 * 60 * 1000) / 1000),
    demo: true
  },
  {
    id: "demo-3",
    pk: "NEWS",
    title: "Sample: Logistics hub reports increased activity",
    summary: "Demo story used to verify the globe with a marker in North America.",
    city: "Vancouver",
    country: "Canada",
    lat: 49.2827,
    lon: -123.1207,
    category: "Business",
    source: "Pulse Globe Demo",
    createdAt: now - 55 * 60 * 1000,
    expiresAt: Math.floor((now + 21 * 60 * 60 * 1000) / 1000),
    demo: true
  }
];