import { categoryList, FEATURED_CATEGORY } from "../lib/categories";

export default function Legend({ mode, items = [], visibleCount, activeCategories, onToggleCategory }) {
  const presentCategories = new Set(items.map((i) => i.category || "World"));
  const chips = categoryList().filter(([name]) => presentCategories.has(name));
  const count = typeof visibleCount === "number" ? visibleCount : items.length;

  return (
    <div className="legend">
      <div className="legend-status">
        <span className={`led ${mode === "gdelt" ? "led-live" : "led-demo"}`} />
        <b>{mode === "gdelt" ? "LIVE DATA" : mode === "loading" ? "CONNECTING" : mode === "error" ? "FEED ERROR" : "DEMO DATA"}</b>
      </div>
      <div className="legend-sub">
        {mode === "gdelt"
          ? `${count} storie${count === 1 ? "" : "s"} shown · GDELT live feed`
          : mode === "loading"
          ? "Fetching latest signals…"
          : "Seeded preview stories"}
      </div>
      {chips.length > 0 && (
        <div className="legend-chips">
          {chips.map(([name, color]) => {
            const isOn = activeCategories.has(name);
            const isFeatured = name === FEATURED_CATEGORY;
            return (
              <button
                key={name}
                type="button"
                className={`chip ${isOn ? "" : "chip-off"} ${isFeatured ? "chip-featured" : ""}`}
                onClick={() => onToggleCategory(name)}
                aria-pressed={isOn}
                title={isFeatured ? "Newest technology stories" : `Toggle ${name}`}
              >
                <span className="chip-dot" style={{ background: color }} />
                {name}
                {isFeatured && <span className="chip-badge">NEW TECH</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
