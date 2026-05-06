# Kyoga Basin Flood Risk Viewer

Open-source web map for the ICPAC/IGAD flood hazard, vulnerability and risk layers
covering the Lake Kyoga basin (Uganda).

Built with **React + Vite + MapLibre GL** + **Cloud-Optimized GeoTIFFs** read directly
in the browser via HTTP range requests. No backend required at runtime.

## Quick start (Docker)

The fastest way to run the app on any machine that has Docker:

```bash
git clone https://github.com/HillaryKoros/kyoga.git
cd kyoga

# Place the processed data in data_cog/ and data_vector/ (see "Data" below)
# Then build the image (data is baked in):
docker compose build
docker compose up -d
```

Open <http://localhost:8080/kyoga/>.

## Project layout

```
kyoga/
├── web/                       React + Vite + MapLibre GL app
│   ├── src/
│   │   ├── App.tsx            map + state
│   │   ├── layers.ts          18-layer registry
│   │   ├── colormaps.ts       matplotlib-style palettes (CSS gradients + COG-protocol URLs)
│   │   └── components/        LayerPanel, MapControls, Legend, PixelInspector
│   └── public/                static assets (incl. stats.json copied from data_cog/)
├── data_cog/                  generated COGs + stats.json (NOT in git — see "Data")
├── data_vector/               generated GeoJSON / FlatGeobuf (NOT in git)
├── convert_to_cog.py          one-off: source GeoTIFFs -> web-mercator COGs (with nodata baked in)
├── export_vectors.py          one-off: gdb -> GeoJSON / FlatGeobuf
├── compute_stats.py           one-off: per-COG vmin/vmax + nodata sentinel
├── Dockerfile                 multi-stage: vite build -> nginx serve
├── nginx.conf                 static host with CORS + range request support
├── docker-compose.yml         convenience for `docker compose up`
└── requirements.txt           Python deps for the data-prep scripts
```

## Data

The processed `data_cog/` (~800 MB) and `data_vector/` (~25 MB) are **not in git** —
they're regenerated from the original ArcGIS dataset by the included scripts.

If you have the original dataset (`Flood_System_Devt/` containing `Flood_Hazard/`,
`Flood_Vulnerability/`, and `Floods_Kyoga_basin/Floods_Kyoga_basin.gdb`):

```bash
# Set up Python venv with data-prep deps
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

# Generate COGs (web-mercator, nodata baked in)
.venv/bin/python convert_to_cog.py

# Extract rivers + study area from the geodatabase
.venv/bin/python export_vectors.py

# Compute per-layer stats (vmin/vmax/nodata) used for color stretching
.venv/bin/python compute_stats.py
```

The three scripts are idempotent and can be re-run safely.

## Development

```bash
cd web
npm install

# stats.json must be available to the app — symlink or copy it once
mkdir -p public
ln -sfn ../../data_cog/stats.json public/stats.json
ln -sfn ../../data_cog public/data_cog
ln -sfn ../../data_vector public/data_vector

npm run dev          # http://localhost:5173/kyoga/
```

The app fetches `stats.json`, COGs, and vectors from the same origin under the
configured `base` path (`/kyoga/` by default).

To target a different host for data (e.g. a CDN), set `VITE_DATA_BASE` at build time:

```bash
VITE_DATA_BASE=https://cdn.example.com/kyoga npm run build
```

## Production build

```bash
cd web && npm run build
```

The output `web/dist/` is a static folder. Combine it with `data_cog/` and
`data_vector/` in any HTTPS-capable static host (Nginx, Apache, S3 + CloudFront,
Cloudflare R2, GitHub Pages, etc.). The host must support **HTTP byte-range
requests** — every static server does by default.

Or just use the Docker image (recommended) — see "Quick start" above.

## Features

- 18 raster layers grouped into Composite / Hazard / Vulnerability with checkboxes
- Per-layer auto color stretch (p2/p98 of valid pixels) with proper nodata masking
- Map controls panel: basemap (OSM | Satellite), opacity, zoom, colormap override, overlay toggles
- Click anywhere on the map → in-app pixel inspector reads each visible COG
- Hover rivers / boundary → property tooltip
- Compact bottom-center legend with CSS gradients

## Open-source stack

- React 19, Vite 8, TypeScript
- MapLibre GL JS (BSD-3)
- `@geomatico/maplibre-cog-protocol` (MIT) — COG raster protocol for MapLibre
- `geotiff` (MIT) — pixel reads via range requests
- nginx (BSD-2) — static host
- Font Awesome Free (CC BY 4.0) — icons
