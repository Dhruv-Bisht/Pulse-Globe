import { categoryList } from "../lib/categories";

export default function Legend({ mode, items = [] }) {
  const activeCategories = new Set(items.map((i) => i.category || "World"));
  const chips = categoryList().filter(([name]) => activeCategories.has(name));

  return (
    <div className="legend">
      <div className="legend-status">
        <span className={`led ${mode === "gdelt" ? "led-live" : "led-demo"}`} />
        <b>{mode === "gdelt" ? "LIVE DATA" : mode === "loading" ? "CONNECTING" : "DEMO DATA"}</b>
      </div>
      <div className="legend-sub">
        {mode === "gdelt"
          ? `${items.length} storie${items.length === 1 ? "" : "s"} · GDELT live feed`
          : mode === "loading"
          ? "Fetching latest signals…"
          : "Seeded preview stories"}
      </div>
      {chips.length > 0 && (
        <div className="legend-chips">
          {chips.map(([name, color]) => (
            <span key={name} className="chip">
              <span className="chip-dot" style={{ background: color }} />
              {name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
