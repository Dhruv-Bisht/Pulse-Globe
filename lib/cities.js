// Shared reference data — used by the API route (to validate/resolve a city
// name into coordinates) and by the Globe component (for nothing, it just
// renders whatever lat/lon the API returns, but keeping one source of truth
// avoids the two drifting apart).

export const CITIES = [
  { name: "San Francisco", lat: 37.7749, lon: -122.4194 },
  { name: "Seattle", lat: 47.6062, lon: -122.3321 },
  { name: "New York", lat: 40.7128, lon: -74.0060 },
  { name: "Austin", lat: 30.2672, lon: -97.7431 },
  { name: "Boston", lat: 42.3601, lon: -71.0589 },
  { name: "Toronto", lat: 43.6532, lon: -79.3832 },
  { name: "Vancouver", lat: 49.2827, lon: -123.1207 },
  { name: "Mexico City", lat: 19.4326, lon: -99.1332 },
  { name: "São Paulo", lat: -23.5505, lon: -46.6333 },
  { name: "Buenos Aires", lat: -34.6037, lon: -58.3816 },
  { name: "Santiago", lat: -33.4489, lon: -70.6693 },
  { name: "Bogotá", lat: 4.7110, lon: -74.0721 },
  { name: "London", lat: 51.5074, lon: -0.1278 },
  { name: "Paris", lat: 48.8566, lon: 2.3522 },
  { name: "Berlin", lat: 52.5200, lon: 13.4050 },
  { name: "Amsterdam", lat: 52.3676, lon: 4.9041 },
  { name: "Dublin", lat: 53.3498, lon: -6.2603 },
  { name: "Stockholm", lat: 59.3293, lon: 18.0686 },
  { name: "Helsinki", lat: 60.1699, lon: 24.9384 },
  { name: "Copenhagen", lat: 55.6761, lon: 12.5683 },
  { name: "Oslo", lat: 59.9139, lon: 10.7522 },
  { name: "Zurich", lat: 47.3769, lon: 8.5417 },
  { name: "Vienna", lat: 48.2082, lon: 16.3738 },
  { name: "Madrid", lat: 40.4168, lon: -3.7038 },
  { name: "Lisbon", lat: 38.7223, lon: -9.1393 },
  { name: "Milan", lat: 45.4642, lon: 9.1900 },
  { name: "Barcelona", lat: 41.3874, lon: 2.1686 },
  { name: "Warsaw", lat: 52.2297, lon: 21.0122 },
  { name: "Istanbul", lat: 41.0082, lon: 28.9784 },
  { name: "Moscow", lat: 55.7558, lon: 37.6173 },
  { name: "Tel Aviv", lat: 32.0853, lon: 34.7818 },
  { name: "Dubai", lat: 25.2048, lon: 55.2708 },
  { name: "Riyadh", lat: 24.7136, lon: 46.6753 },
  { name: "Cairo", lat: 30.0444, lon: 31.2357 },
  { name: "Lagos", lat: 6.5244, lon: 3.3792 },
  { name: "Nairobi", lat: -1.2921, lon: 36.8219 },
  { name: "Cape Town", lat: -33.9249, lon: 18.4241 },
  { name: "Bangalore", lat: 12.9716, lon: 77.5946 },
  { name: "Mumbai", lat: 19.0760, lon: 72.8777 },
  { name: "Delhi", lat: 28.7041, lon: 77.1025 },
  { name: "Singapore", lat: 1.3521, lon: 103.8198 },
  { name: "Jakarta", lat: -6.2088, lon: 106.8456 },
  { name: "Kuala Lumpur", lat: 3.1390, lon: 101.6869 },
  { name: "Bangkok", lat: 13.7563, lon: 100.5018 },
  { name: "Hanoi", lat: 21.0278, lon: 105.8342 },
  { name: "Hong Kong", lat: 22.3193, lon: 114.1694 },
  { name: "Shanghai", lat: 31.2304, lon: 121.4737 },
  { name: "Shenzhen", lat: 22.5431, lon: 114.0579 },
  { name: "Beijing", lat: 39.9042, lon: 116.4074 },
  { name: "Seoul", lat: 37.5665, lon: 126.9780 },
  { name: "Tokyo", lat: 35.6762, lon: 139.6503 },
  { name: "Osaka", lat: 34.6937, lon: 135.5023 },
  { name: "Taipei", lat: 25.0330, lon: 121.5654 },
  { name: "Sydney", lat: -33.8688, lon: 151.2093 },
  { name: "Melbourne", lat: -37.8136, lon: 144.9631 },
  { name: "Auckland", lat: -36.8485, lon: 174.7633 },
  { name: "Denver", lat: 39.7392, lon: -104.9903 },
  { name: "Chicago", lat: 41.8781, lon: -87.6298 },
  { name: "Los Angeles", lat: 34.0522, lon: -118.2437 },
  { name: "Miami", lat: 25.7617, lon: -80.1918 },
  { name: "Washington DC", lat: 38.9072, lon: -77.0369 }
];

export const CATEGORIES = {
  AI: "#B98CFF",
  Hardware: "#4FD1C5",
  Software: "#7BD88F",
  Security: "#FF6B6B",
  Business: "#F2B75C",
  Space: "#6FA8FF"
};

export function findCity(name) {
  if (!name) return null;
  const n = String(name).trim().toLowerCase();
  return CITIES.find((c) => c.name.toLowerCase() === n) || null;
}
