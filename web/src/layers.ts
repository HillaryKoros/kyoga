export type LayerGroup = "Composite" | "Hazard factors" | "Vulnerability factors";

export interface LayerDef {
  id: string;
  name: string;
  path: string;       // relative to /data_cog/
  cmap: string;       // matching @geomatico/maplibre-cog-protocol palette
  group: LayerGroup;
  blurb: string;
}

export interface RasterStats {
  vmin: number;
  vmax: number;
  median: number;
  min: number;
  max: number;
  background: number | null;
  declared_nodata: number | null;
}

export type StatsMap = Record<string, RasterStats>;

export const LAYERS: LayerDef[] = [
  { id: "flood_risk",          name: "Flood Risk",                 path: "Flood_Vulnerability/Flood_Risk.tif",                  cmap: "rdylgn_r", group: "Composite",            blurb: "Final risk = hazard × vulnerability" },
  { id: "flood_hazard",        name: "Flood Hazard",               path: "Flood_Hazard/Flood_Hazard.tif",                       cmap: "rdylgn_r", group: "Composite",            blurb: "Composite physical flood hazard score" },
  { id: "flood_vulnerability", name: "Flood Vulnerability",        path: "Flood_Vulnerability/Flood_Vulnerability.tif",         cmap: "rdylgn_r", group: "Composite",            blurb: "Composite social vulnerability score" },
  { id: "elevation",           name: "Elevation",                  path: "Flood_Hazard/Elevation.tif",                          cmap: "terrain",  group: "Hazard factors",       blurb: "DEM (meters)" },
  { id: "slope",               name: "Slope",                      path: "Flood_Hazard/Slope.tif",                              cmap: "magma",    group: "Hazard factors",       blurb: "Terrain slope (degrees)" },
  { id: "hand",                name: "HAND",                       path: "Flood_Hazard/HAND.tif",                               cmap: "blues_r",  group: "Hazard factors",       blurb: "Height Above Nearest Drainage" },
  { id: "twi",                 name: "TWI",                        path: "Flood_Hazard/TWI.tif",                                cmap: "blues",    group: "Hazard factors",       blurb: "Topographic Wetness Index" },
  { id: "flow_acc",            name: "Flow Accumulation",          path: "Flood_Hazard/Flow_Accumulation.tif",                  cmap: "blues",    group: "Hazard factors",       blurb: "Upstream contributing area" },
  { id: "drain_density",       name: "Drainage Density",           path: "Flood_Hazard/Drainage_Density.tif",                   cmap: "blues",    group: "Hazard factors",       blurb: "Stream density" },
  { id: "dist_water",          name: "Distance to Waterbodies",    path: "Flood_Hazard/DistanceToWaterbodies.tif",              cmap: "blues_r",  group: "Hazard factors",       blurb: "Closer = higher hazard" },
  { id: "rainfall",            name: "Rainfall (extreme)",         path: "Flood_Hazard/Rainfall_Extreme.tif",                   cmap: "viridis",  group: "Hazard factors",       blurb: "Extreme rainfall climatology" },
  { id: "clay",                name: "Clay Content",               path: "Flood_Hazard/Clay_Content.tif",                       cmap: "ylorbr",   group: "Hazard factors",       blurb: "Soil clay (raw units)" },
  { id: "pop",                 name: "Population Density",         path: "Flood_Vulnerability/Population_density.tif",          cmap: "orrd",     group: "Vulnerability factors", blurb: "Population density rank (1-5)" },
  { id: "settlement",          name: "Settlement",                 path: "Flood_Vulnerability/Settlement.tif",                  cmap: "reds",     group: "Vulnerability factors", blurb: "Settlement rank (1-5)" },
  { id: "lulc",                name: "Land Use / Land Cover",      path: "Flood_Vulnerability/LULC.tif",                        cmap: "tab10",    group: "Vulnerability factors", blurb: "LULC class (1-5)" },
  { id: "poverty",             name: "Poverty Index",              path: "Flood_Vulnerability/Poverty_Index.tif",               cmap: "orrd",     group: "Vulnerability factors", blurb: "Poverty rank (1-5)" },
  { id: "dist_roads",          name: "Distance to Roads",          path: "Flood_Vulnerability/Distance_to_roads.tif",           cmap: "greys",    group: "Vulnerability factors", blurb: "Access rank (1-5)" },
  { id: "dist_health",         name: "Distance to Health Facilities", path: "Flood_Vulnerability/Distance_to_Healthfacilities.tif", cmap: "greys", group: "Vulnerability factors", blurb: "Access rank (1-5)" },
];

export const GROUPS: LayerGroup[] = ["Composite", "Hazard factors", "Vulnerability factors"];

// Where to fetch the processed data from.
//   VITE_DATA_BASE  — explicit absolute or relative URL (e.g. "https://cdn.example.com/kyoga")
//   default         — same origin, joined with Vite's `base` (e.g. "/kyoga/")
export const DATA_BASE = (import.meta.env.VITE_DATA_BASE ?? import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
export const cogUrl = (path: string) => `${DATA_BASE}/data_cog/${path}`;
export const vectorUrl = (file: string) => `${DATA_BASE}/data_vector/${file}`;
export const statsUrl = () => `${DATA_BASE}/stats.json`;
