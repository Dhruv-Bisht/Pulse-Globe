import { TIME_RANGES } from "../lib/time-ranges";

export default function RangeSlider({ index, onChange, loading }) {
  const current = TIME_RANGES[index] || TIME_RANGES[0];

  return (
    <div className="range-slider" role="group" aria-label="Time range">
      <div className="range-slider-head">
        <span className="range-slider-label">TIME WINDOW</span>
        <span className="range-slider-value">{current.label}{loading ? " · updating…" : ""}</span>
      </div>
      <input
        type="range"
        min={0}
        max={TIME_RANGES.length - 1}
        step={1}
        value={index}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range-slider-input"
        aria-valuetext={current.label}
      />
      <div className="range-slider-ticks">
        {TIME_RANGES.map((r, i) => (
          <span key={r.key} className={`range-slider-tick ${i === index ? "active" : ""}`}>
            {r.short}
          </span>
        ))}
      </div>
    </div>
  );
}
