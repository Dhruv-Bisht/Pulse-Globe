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

export function categoryColor(category) {
  return CATEGORY_COLORS[category] || DEFAULT_COLOR;
}

export function categoryList() {
  return Object.entries(CATEGORY_COLORS);
}

export function timeAgo(ts) {
  if (!ts) return "";
  const diff = Date.now() - Number(ts);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
