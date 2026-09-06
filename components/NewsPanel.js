"use client";

import { useEffect, useState } from "react";
import { CATEGORIES } from "@/lib/cities";

const DAY_MS = 24 * 60 * 60 * 1000;

function formatAgo(ms) {
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m ago`;
  return `${Math.floor(h / 24)}d ago`;
}
function formatRemaining(item) {
  const rem = DAY_MS - (Date.now() - item.timestamp);
  if (rem <= 0) return "expired";
  const h = Math.floor(rem / 3600000);
  const m = Math.floor((rem % 3600000) / 60000);
  return `${h}h ${m}m`;
}

export default function NewsPanel({ item, onClose }) {
  // Re-render every 20s while open so "posted"/"expires" stay live.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 20000);
    return () => clearInterval(id);
  }, []);

  const open = Boolean(item);
  const category = item && CATEGORIES[item.category] ? item.category : "Software";
  const color = CATEGORIES[category];

  return (
    <div className={`panel${open ? " open" : ""}`}>
      <button className="closeBtn" onClick={onClose} aria-label="Close">
        &times;
      </button>
      {item && (
        <>
          <div className="chip" style={{ background: `${color}22`, color }}>
            <span className="d" style={{ background: color }} />
            {category}
          </div>
          <h2>{item.title}</h2>
          <p className="gist">{item.gist}</p>
          <div className="meta">
            <div>
              <span className="k">city</span>
              {item.city}
            </div>
            <div>
              <span className="k">posted</span>
              {formatAgo(Date.now() - item.timestamp)}
            </div>
            <div>
              <span className="k">expires</span>
              {formatRemaining(item)}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
