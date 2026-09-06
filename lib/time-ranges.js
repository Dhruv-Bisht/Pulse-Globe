// A single source of truth for the "1 hour -> 1 year" slider.
//
// GDELT's GEO 2.0 API (which returns real per-article lat/lon points) can
// only look back up to 7 days. Beyond that we fall back to the DOC 2.0 API,
// which searches up to a year back but only returns a source *country* per
// article, not a precise point — those are placed on the globe using country
// centroids (see lib/country-centroids.js) and are labeled accordingly.
export const TIME_RANGES = [
  { key: "1h", label: "1 hour", short: "1h", source: "geo", timespan: "1h" },
  { key: "3h", label: "3 hours", short: "3h", source: "geo", timespan: "3h" },
  { key: "6h", label: "6 hours", short: "6h", source: "geo", timespan: "6h" },
  { key: "12h", label: "12 hours", short: "12h", source: "geo", timespan: "12h" },
  { key: "24h", label: "24 hours", short: "24h", source: "geo", timespan: "24h" },
  { key: "3d", label: "3 days", short: "3d", source: "geo", timespan: "3d" },
  { key: "7d", label: "7 days", short: "7d", source: "geo", timespan: "7d" },
  { key: "1m", label: "1 month", short: "1mo", source: "doc", timespan: "1m" },
  { key: "3m", label: "3 months", short: "3mo", source: "doc", timespan: "3m" },
  { key: "6m", label: "6 months", short: "6mo", source: "doc", timespan: "6m" },
  { key: "1y", label: "1 year", short: "1y", source: "doc", timespan: "1y" }
];

export const DEFAULT_RANGE_KEY = "24h";

export function rangeByKey(key) {
  return TIME_RANGES.find((r) => r.key === key) || TIME_RANGES.find((r) => r.key === DEFAULT_RANGE_KEY);
}

export function rangeByIndex(index) {
  const i = Math.max(0, Math.min(TIME_RANGES.length - 1, Number(index) || 0));
  return TIME_RANGES[i];
}

export function indexForKey(key) {
  const i = TIME_RANGES.findIndex((r) => r.key === key);
  return i === -1 ? TIME_RANGES.findIndex((r) => r.key === DEFAULT_RANGE_KEY) : i;
}
