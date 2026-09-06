import { categoryColor, timeAgo } from "../lib/categories";

export default function NewsPanel({ item, enrichment, enriching, onClose, onOpenRelated }) {
  if (!item) return null;
  const color = categoryColor(item.category);

  const displayTitle = enrichment?.title || item.title;
  const displayImage = enrichment?.image || item.image;
  const displaySite = enrichment?.siteName;
  const publishedAt = enrichment?.publishedAt ? Date.parse(enrichment.publishedAt) : NaN;
  const timeLabel = Number.isFinite(publishedAt) ? timeAgo(publishedAt) : (item.approxTime ? `~${timeAgo(item.createdAt)}` : timeAgo(item.createdAt));
  const description = enrichment?.excerpt || enrichment?.description || item.summary;

  return (
    <aside className="panel" aria-live="polite">
      <button className="close" onClick={onClose} aria-label="Close">×</button>
      <div className="panel-badge" style={{ color, borderColor: `${color}55`, background: `${color}1a` }}>
        {item.category || "World"}
      </div>
      <div className="meta">
        {item.city}
        {item.country && item.country !== item.city ? `, ${item.country}` : ""} · {timeLabel}
      </div>
      <h2>{displayTitle}</h2>

      {displayImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="panel-image" src={displayImage} alt="" onError={(e) => { e.currentTarget.style.display = "none"; }} />
      )}

      <div className="summary">{description}</div>

      {enriching && <div className="panel-loading">Pulling more detail from the source…</div>}
      {!enriching && enrichment && !enrichment.ok && (
        <div className="panel-note">Couldn't load extra detail from the source — showing what GDELT reported.</div>
      )}

      {item.countryLevel && (
        <div className="panel-note">
          Placed at the country level — GDELT only reports a precise location for stories from the last 7 days.
        </div>
      )}

      <div className="source-row">
        {item.source && (
          <a className="source" href={item.url} target="_blank" rel="noopener noreferrer">
            {displaySite || item.source} ↗
          </a>
        )}
        {item.language && <span className="lang-tag">{item.language}</span>}
      </div>

      {item.related && item.related.length > 0 && (
        <div className="related">
          <div className="related-title">More coverage of this story</div>
          {item.related.map((r) => (
            <a key={r.url} className="related-link" href={r.url} target="_blank" rel="noopener noreferrer">
              {r.source}: {r.title}
            </a>
          ))}
        </div>
      )}

      {item.demo && <div className="demo-note">Demo story — replace with your own feed.</div>}
    </aside>
  );
}
