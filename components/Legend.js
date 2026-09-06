import { CATEGORIES } from "@/lib/cities";

export default function Legend() {
  return (
    <div className="legend">
      {Object.entries(CATEGORIES).map(([name, color]) => (
        <div className="legendItem" key={name}>
          <span className="legendDot" style={{ background: color }} />
          {name}
        </div>
      ))}
    </div>
  );
}
