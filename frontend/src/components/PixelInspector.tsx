interface Row {
  name: string;
  group: string;
  value: number | null;
}

function fmtVal(v: number | null): string {
  if (v === null || Number.isNaN(v)) return "—";
  const a = Math.abs(v);
  if (a >= 10000 || (a > 0 && a < 0.001)) return v.toExponential(2);
  return v.toLocaleString(undefined, { maximumFractionDigits: 3 });
}

export function PixelInspector({
  point,
  rows,
  loading,
  onClose,
}: {
  point: { lat: number; lon: number } | null;
  rows: Row[];
  loading: boolean;
  onClose: () => void;
}) {
  if (!point) return null;
  return (
    <div className="inspector">
      <div className="inspector-header">
        <strong>Pixel inspector</strong>
        <span className="muted">{point.lat.toFixed(5)}, {point.lon.toFixed(5)}</span>
        <button className="close" onClick={onClose}>×</button>
      </div>
      {loading ? (
        <div className="loading">reading rasters…</div>
      ) : rows.length === 0 ? (
        <div className="muted">Select at least one raster layer.</div>
      ) : (
        <table className="inspector-table">
          <thead>
            <tr><th>Layer</th><th>Group</th><th style={{ textAlign: "right" }}>Value</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name}>
                <td>{r.name}</td>
                <td className="muted">{r.group}</td>
                <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  {fmtVal(r.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
