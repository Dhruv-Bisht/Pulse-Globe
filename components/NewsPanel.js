import { categoryColor, timeAgo } from "../lib/categories";

export default function NewsPanel({ item, onClose }) {
  if (!item) return null;
  const color = categoryColor(item.category);

  return (
    <aside className="panel" aria-live="polite">
      <button className="close" onClick={onClose} aria-label="Close">×</button>
      <div className="panel-badge" style={{ color, borderColor: `${color}55`, background: `${color}1a` }}>
        {item.category || "World"}
      </div>
      <div className="meta">
        {item.city}
        {item.country ? `, ${item.country}` : ""} · {timeAgo(item.createdAt)}
      </div>
      <h2>{item.title}</h2>
      <div className="summary">{item.summary}</div>
      {item.source && <div className="source">Source: {item.source}</div>}
      {item.demo && <div className="demo-note">Demo story — replace with your own feed.</div>}
    </aside>
  );
}
