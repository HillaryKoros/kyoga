import { gradientCss } from "../colormaps";

interface Entry {
  name: string;
  palette: string;
  vmin: number;
  vmax: number;
}

function fmt(v: number): string {
  if (v === 0) return "0";
  const a = Math.abs(v);
  if (a >= 1000 || a < 0.01) return v.toExponential(1);
  if (a >= 100) return v.toFixed(0);
  if (a >= 10) return v.toFixed(1);
  return v.toPrecision(2);
}

export function Legend({ entries }: { entries: Entry[] }) {
  if (entries.length === 0) return null;
  return (
    <div className="legend">
      <div className="legend-title">Legend</div>
      {entries.map((e) => (
        <div key={e.name} className="legend-row">
          <div className="legend-name">{e.name}</div>
          <div className="legend-bar">
            <span className="legend-tick">{fmt(e.vmin)}</span>
            <div className="legend-gradient" style={{ background: gradientCss(e.palette) }} />
            <span className="legend-tick">{fmt(e.vmax)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
