export const CATEGORY_COLORS = {
  Technology: "#67e8f9",
  Climate: "#34d399",
  Business: "#fbbf24",
  Politics: "#a78bfa",
  Science: "#38bdf8",
  Health: "#fb7185",
  World: "#f97373"
};

export const DEFAULT_COLOR = "#fb7185";

// The category this build is spotlighting on the globe. Its markers get an
// extra glow ring and the legend chip gets a small badge.
export const FEATURED_CATEGORY = "Technology";

export function categoryColor(category) {
  return CATEGORY_COLORS[category] || DEFAULT_COLOR;
}

export function categoryList() {
  return Object.entries(CATEGORY_COLORS);
}

export function timeAgo(ts) {
  if (!ts) return "";
  const diff = Date.now() - Number(ts);
  if (diff < 0) return "just now";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (days < 31) return `${weeks}w ago`;
  const months = Math.floor(days / 30.4);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}
