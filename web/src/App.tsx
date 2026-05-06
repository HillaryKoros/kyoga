import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { cogProtocol, locationValues } from "@geomatico/maplibre-cog-protocol";
import { LAYERS, cogUrl, vectorUrl, statsUrl, type StatsMap } from "./layers";
import { cogTileUrl } from "./colormaps";
import { LayerPanel } from "./components/LayerPanel";
import { MapControls } from "./components/MapControls";
import { Legend } from "./components/Legend";
import { PixelInspector } from "./components/PixelInspector";
import "./App.css";

maplibregl.addProtocol("cog", cogProtocol);

// Tile providers — kept as a simple list so we never call setStyle (which would wipe custom layers).
// We swap only the basemap source's URL via a shared "basemap" source/layer pair.
interface BasemapDef { tiles: string[]; attribution: string; }
const BASEMAP_TILES: Record<string, BasemapDef> = {
  osm: {
    tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
    attribution: "© OpenStreetMap contributors",
  },
  satellite: {
    tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
    attribution: "Tiles © Esri",
  },
};
const BASEMAP_SRC = "basemap";
const BASEMAP_LAYER = "basemap";
const EMPTY_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {},
  layers: [],
};

const RASTER_LAYER_PREFIX = "cog-";
const RIVERS_SRC = "rivers-src";
const RIVERS_LAYER = "rivers-line";
const BOUNDARY_SRC = "boundary-src";
const BOUNDARY_LAYER = "boundary-line";

// Resolve a possibly-relative URL to an absolute one using the page origin.
function absUrl(u: string): string {
  return new URL(u, window.location.href).toString();
}

// Returns the id of the first layer whose id starts with the given prefix, or undefined.
function firstLayerWithPrefix(map: maplibregl.Map, prefix: string): string | undefined {
  for (const l of map.getStyle().layers ?? []) {
    if (l.id.startsWith(prefix)) return l.id;
  }
  return undefined;
}

export default function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [stats, setStats] = useState<StatsMap | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set(["flood_risk"]));
  const [opacity, setOpacity] = useState(0.85);
  const [paletteOverride, setPaletteOverride] = useState<string | null>(null);
  const [showRivers, setShowRivers] = useState(true);
  const [showBoundary, setShowBoundary] = useState(true);
  const [basemap, setBasemap] = useState("osm");
  const [hoveredRiver, setHoveredRiver] = useState<{ x: number; y: number; props: Record<string, unknown> } | null>(null);
  const [clickPoint, setClickPoint] = useState<{ lat: number; lon: number } | null>(null);
  const [pixelRows, setPixelRows] = useState<{ name: string; group: string; value: number | null }[]>([]);
  const [pixelLoading, setPixelLoading] = useState(false);

  useEffect(() => {
    fetch(statsUrl()).then((r) => r.json()).then(setStats).catch(console.error);
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    // Strip any stale "#z/lat/lon" left over from a previous session.
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: EMPTY_STYLE,
      center: [33.5, 1.9],
      zoom: 7.5,
    });
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");
    mapRef.current = map;

    map.on("click", (e) => {
      setClickPoint({ lat: e.lngLat.lat, lon: e.lngLat.lng });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Apply / swap basemap via a single dedicated source — never call setStyle, so custom layers persist.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let cancelled = false;
    let applied = false;
    const apply = () => {
      if (cancelled || applied) return;
      if (!map.isStyleLoaded()) return;
      applied = true;
      const def = BASEMAP_TILES[basemap];
      if (!def) return;
      if (map.getLayer(BASEMAP_LAYER)) map.removeLayer(BASEMAP_LAYER);
      if (map.getSource(BASEMAP_SRC)) map.removeSource(BASEMAP_SRC);
      map.addSource(BASEMAP_SRC, {
        type: "raster",
        tiles: def.tiles,
        tileSize: 256,
        attribution: def.attribution,
      });
      // Insert at the very bottom (before any other layer).
      const firstOther = (map.getStyle().layers ?? []).find((l) => l.id !== BASEMAP_LAYER)?.id;
      map.addLayer({ id: BASEMAP_LAYER, type: "raster", source: BASEMAP_SRC }, firstOther);
    };
    apply();
    map.on("styledata", apply);
    map.on("load", apply);
    return () => {
      cancelled = true;
      map.off("styledata", apply);
      map.off("load", apply);
    };
  }, [basemap]);

  const activeLayers = useMemo(() => {
    if (!stats) return [];
    return LAYERS.filter((l) => selected.has(l.id))
      .map((l) => {
        const s = stats[l.path];
        if (!s) return null;
        const palette = paletteOverride ?? l.cmap;
        return { layer: l, stats: s, palette };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [selected, stats, paletteOverride]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !stats) return;
    let cancelled = false;

    const reconcile = () => {
      if (cancelled) return;
      if (!map.isStyleLoaded()) return; // wait for the next styledata fire
      const wantedIds = new Set(activeLayers.map((a) => RASTER_LAYER_PREFIX + a.layer.id));
      const style = map.getStyle();
      for (const layer of style.layers ?? []) {
        if (layer.id.startsWith(RASTER_LAYER_PREFIX) && !wantedIds.has(layer.id)) {
          if (map.getLayer(layer.id)) map.removeLayer(layer.id);
          if (map.getSource(layer.id)) map.removeSource(layer.id);
        }
      }
      for (const a of activeLayers) {
        const id = RASTER_LAYER_PREFIX + a.layer.id;
        const sourceUrl = cogTileUrl(absUrl(cogUrl(a.layer.path)), a.palette, a.stats.vmin, a.stats.vmax);
        const existing = map.getSource(id) as (maplibregl.RasterTileSource & { _options?: { url?: string } }) | undefined;
        const currentUrl = existing?._options?.url;
        if (!existing || currentUrl !== sourceUrl) {
          if (map.getLayer(id)) map.removeLayer(id);
          if (map.getSource(id)) map.removeSource(id);
          map.addSource(id, { type: "raster", url: sourceUrl, tileSize: 256 });
          map.addLayer({
            id,
            type: "raster",
            source: id,
            paint: { "raster-opacity": opacity, "raster-resampling": "nearest" },
          });
        } else {
          map.setPaintProperty(id, "raster-opacity", opacity);
        }
      }
    };

    reconcile();
    map.on("styledata", reconcile);
    map.on("load", reconcile);
    return () => {
      cancelled = true;
      map.off("styledata", reconcile);
      map.off("load", reconcile);
    };
  }, [activeLayers, opacity, stats]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let cancelled = false;

    const apply = () => {
      if (cancelled) return;
      if (!map.isStyleLoaded()) return; // wait for next styledata fire
      if (showBoundary) {
        if (!map.getSource(BOUNDARY_SRC)) {
          map.addSource(BOUNDARY_SRC, { type: "geojson", data: vectorUrl("study_area.geojson") });
          // Place boundary just above basemap: before rivers if present, else before first raster.
          const boundaryBefore = map.getLayer(RIVERS_LAYER)
            ? RIVERS_LAYER
            : firstLayerWithPrefix(map, RASTER_LAYER_PREFIX);
          map.addLayer({
            id: BOUNDARY_LAYER,
            type: "line",
            source: BOUNDARY_SRC,
            paint: { "line-color": "#222", "line-width": 2, "line-dasharray": [4, 4] },
          }, boundaryBefore);
        }
      } else {
        if (map.getLayer(BOUNDARY_LAYER)) map.removeLayer(BOUNDARY_LAYER);
        if (map.getSource(BOUNDARY_SRC)) map.removeSource(BOUNDARY_SRC);
      }

      if (showRivers) {
        if (!map.getSource(RIVERS_SRC)) {
          map.addSource(RIVERS_SRC, { type: "geojson", data: vectorUrl("rivers.geojson") });
          // Rivers go beneath rasters but above boundary.
          const riversBefore = firstLayerWithPrefix(map, RASTER_LAYER_PREFIX);
          map.addLayer({
            id: RIVERS_LAYER,
            type: "line",
            source: RIVERS_SRC,
            paint: { "line-color": "#1f6feb", "line-width": 1, "line-opacity": 0.8 },
          }, riversBefore);
          map.on("mousemove", RIVERS_LAYER, (e) => {
            if (!e.features?.length) return;
            map.getCanvas().style.cursor = "crosshair";
            setHoveredRiver({
              x: e.point.x,
              y: e.point.y,
              props: e.features[0].properties as Record<string, unknown>,
            });
          });
          map.on("mouseleave", RIVERS_LAYER, () => {
            map.getCanvas().style.cursor = "";
            setHoveredRiver(null);
          });
        }
      } else {
        if (map.getLayer(RIVERS_LAYER)) map.removeLayer(RIVERS_LAYER);
        if (map.getSource(RIVERS_SRC)) map.removeSource(RIVERS_SRC);
      }
    };

    apply();
    map.on("styledata", apply);
    map.on("load", apply);
    return () => {
      cancelled = true;
      map.off("styledata", apply);
      map.off("load", apply);
    };
  }, [showRivers, showBoundary]);

  useEffect(() => {
    if (!clickPoint || !stats) {
      setPixelRows([]);
      return;
    }
    const layers = LAYERS.filter((l) => selected.has(l.id));
    if (layers.length === 0) {
      setPixelRows([]);
      return;
    }
    setPixelLoading(true);
    Promise.all(
      layers.map(async (l) => {
        try {
          const url = absUrl(cogUrl(l.path));
          const vals = await locationValues(url, { latitude: clickPoint.lat, longitude: clickPoint.lon });
          let v: number | null = vals?.[0] ?? null;
          const s = stats[l.path];
          if (s) {
            if (s.background !== null && v === s.background) v = null;
            if (s.declared_nodata !== null && v === s.declared_nodata) v = null;
          }
          if (typeof v === "number" && !Number.isFinite(v)) v = null;
          return { name: l.name, group: l.group, value: v };
        } catch {
          return { name: l.name, group: l.group, value: null };
        }
      })
    ).then((rows) => {
      setPixelRows(rows);
      setPixelLoading(false);
    });
  }, [clickPoint, selected, stats]);

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const legendEntries = activeLayers.map((a) => ({
    name: a.layer.name,
    palette: a.palette,
    vmin: a.stats.vmin,
    vmax: a.stats.vmax,
  }));

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden />
          <div className="brand-text">
            <h1>Kyoga Basin — Flood Risk Viewer</h1>
            <p>Lake Kyoga (Uganda) · hazard, vulnerability &amp; risk</p>
          </div>
        </div>
        <p className="header-hint muted">
          Hover vectors for properties · click the map to inspect raster pixel values
        </p>
      </header>
      <div className="app-body">
      <LayerPanel selected={selected} toggle={toggle} />
      <div className="map-area">
        <div ref={containerRef} className="map" />
        <MapControls
          opacity={opacity}
          setOpacity={setOpacity}
          basemap={basemap}
          setBasemap={setBasemap}
          paletteOverride={paletteOverride}
          setPaletteOverride={setPaletteOverride}
          showRivers={showRivers}
          setShowRivers={setShowRivers}
          showBoundary={showBoundary}
          setShowBoundary={setShowBoundary}
          onZoomIn={() => mapRef.current?.zoomIn()}
          onZoomOut={() => mapRef.current?.zoomOut()}
        />
        <Legend entries={legendEntries} />
        {hoveredRiver && (
          <div
            className="hover-tip"
            style={{ left: hoveredRiver.x + 14, top: hoveredRiver.y + 14 }}
          >
            <div><strong>River reach</strong></div>
            <div>Reach ID: {String(hoveredRiver.props.arcid ?? "—")}</div>
            <div>
              Length (deg):{" "}
              {(() => {
                const v = hoveredRiver.props.Shape_Length as number | undefined;
                return typeof v === "number" ? v.toFixed(4) : "—";
              })()}
            </div>
          </div>
        )}
        <PixelInspector
          point={clickPoint}
          rows={pixelRows}
          loading={pixelLoading}
          onClose={() => setClickPoint(null)}
        />
      </div>
      </div>
    </div>
  );
}
