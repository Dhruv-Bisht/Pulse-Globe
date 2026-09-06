export default function NewsPanel({ item, onClose }) {
  return (
    <aside className="panel" aria-live="polite">
      <button
        onClick={onClose}
        aria-label="Close story"
        style={{ float: "right", background: "transparent", color: "#aeb7c5", border: 0, cursor: "pointer", fontSize: 20 }}
      >
        ×
      </button>
      <h2>{item.title}</h2>
      <p>{item.summary}</p>
      <div className="meta">
        {item.city} · {item.category} · {new Date(item.createdAt).toLocaleString()}
      </div>
    </aside>
  );
}