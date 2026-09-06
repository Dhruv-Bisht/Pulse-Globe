"use client";

import { useEffect, useMemo, useState } from "react";
import NewsPanel from "./NewsPanel";

function project(lat, lon) {
  // Equirectangular projection into the globe container.
  const x = 50 + (lon / 180) * 42;
  const y = 50 - (lat / 90) * 42;
  return { left: `${x}%`, top: `${y}%` };
}

export default function Globe() {
  const [news, setNews] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");

  async function loadNews() {
    try {
      const response = await fetch("/api/news", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setNews(Array.isArray(data.items) ? data.items : []);
      setError("");
    } catch {
      setError("Unable to refresh news right now.");
    }
  }

  useEffect(() => {
    loadNews();
    const timer = setInterval(loadNews, 45000);
    return () => clearInterval(timer);
  }, []);

  const markers = useMemo(() => news.filter(n =>
    Number.isFinite(Number(n.lat)) && Number.isFinite(Number(n.lon))
  ), [news]);

  return (
    <div className="globe-wrap">
      <div className="globe" aria-label="Global news map">
        <div className="gridline lat" />
        <div className="gridline lat2" />
        <div className="gridline lon" />
        <div className="gridline lon2" />
        {markers.map(item => (
          <button
            className="marker"
            style={project(Number(item.lat), Number(item.lon))}
            key={item.id}
            title={item.title}
            aria-label={`Open ${item.title}`}
            onClick={() => setSelected(item)}
          />
        ))}
      </div>

      {selected && <NewsPanel item={selected} onClose={() => setSelected(null)} />}
      {error && <div className="panel"><p>{error}</p></div>}
      {!error && news.length === 0 && <div className="empty">No stories in the last 24 hours.</div>}
    </div>
  );
}