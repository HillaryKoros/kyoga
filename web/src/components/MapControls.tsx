import { useState } from "react";
import { PALETTE_NAMES } from "../colormaps";

interface Props {
  opacity: number;
  setOpacity: (v: number) => void;
  basemap: string;
  setBasemap: (v: string) => void;
  paletteOverride: string | null;
  setPaletteOverride: (p: string | null) => void;
  showRivers: boolean;
  setShowRivers: (v: boolean) => void;
  showBoundary: boolean;
  setShowBoundary: (v: boolean) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export function MapControls(p: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`map-controls${open ? "" : " collapsed"}`}>
      {!open && (
        <button
          className="map-controls-icon"
          onClick={() => setOpen(true)}
          title="Map controls"
          aria-label="Open map controls"
        >
          <i className="fa-solid fa-layer-group" />
        </button>
      )}
      {open && (
        <div className="map-controls-body">
          <div className="map-controls-header">
            <span><i className="fa-solid fa-layer-group" /> Map controls</span>
            <button className="map-controls-close" onClick={() => setOpen(false)} aria-label="Close">
              <i className="fa-solid fa-xmark" />
            </button>
          </div>

          <div className="map-controls-section">
            <div className="map-controls-title"><i className="fa-solid fa-map" /> Basemap</div>
            <div className="seg" role="tablist" aria-label="Basemap">
              <button
                role="tab"
                aria-selected={p.basemap === "osm"}
                className={`seg-item${p.basemap === "osm" ? " active" : ""}`}
                onClick={() => p.setBasemap("osm")}
              >
                <i className="fa-solid fa-road" /> OSM
              </button>
              <button
                role="tab"
                aria-selected={p.basemap === "satellite"}
                className={`seg-item${p.basemap === "satellite" ? " active" : ""}`}
                onClick={() => p.setBasemap("satellite")}
              >
                <i className="fa-solid fa-satellite" /> Satellite
              </button>
            </div>
          </div>

          <div className="map-controls-section">
            <div className="map-controls-title"><i className="fa-solid fa-circle-half-stroke" /> Opacity</div>
            <div className="ctrl-row">
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={p.opacity}
                onChange={(e) => p.setOpacity(Number(e.target.value))}
                aria-label="Layer opacity"
              />
              <span className="num">{p.opacity.toFixed(2)}</span>
            </div>
          </div>

          <div className="map-controls-section">
            <div className="map-controls-title"><i className="fa-solid fa-magnifying-glass-plus" /> Zoom</div>
            <div className="zoom-row">
              <button className="zoom-btn" onClick={p.onZoomIn} aria-label="Zoom in" title="Zoom in">
                <i className="fa-solid fa-plus" />
              </button>
              <button className="zoom-btn" onClick={p.onZoomOut} aria-label="Zoom out" title="Zoom out">
                <i className="fa-solid fa-minus" />
              </button>
            </div>
          </div>

          <div className="map-controls-section">
            <div className="map-controls-title"><i className="fa-solid fa-palette" /> Style (colormap)</div>
            <select
              className="full-width"
              value={p.paletteOverride ?? ""}
              onChange={(e) => p.setPaletteOverride(e.target.value || null)}
            >
              <option value="">(use layer default)</option>
              {PALETTE_NAMES.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          <div className="map-controls-section">
            <div className="map-controls-title"><i className="fa-solid fa-draw-polygon" /> Overlays</div>
            <label className="ctrl-row">
              <input
                type="checkbox"
                checked={p.showRivers}
                onChange={(e) => p.setShowRivers(e.target.checked)}
              />
              <span className="row-label"><i className="fa-solid fa-water" /> Rivers</span>
            </label>
            <label className="ctrl-row">
              <input
                type="checkbox"
                checked={p.showBoundary}
                onChange={(e) => p.setShowBoundary(e.target.checked)}
              />
              <span className="row-label"><i className="fa-solid fa-vector-square" /> Study area</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
