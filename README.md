# Kyoga Basin Flood Risk Viewer

Open-source web map for the ICPAC/IGAD flood hazard, vulnerability and risk layers
covering the Lake Kyoga basin (Uganda).

Built with **React + Vite + MapLibre GL** + **Cloud-Optimized GeoTIFFs** read directly
in the browser via HTTP range requests. No backend required at runtime.

## Live demo

A public instance runs at **<http://149.102.153.66:8080/kyoga/>**.

## Quick start

There are two ways to run the app locally — **Docker** (recommended, single command)
and **without Docker** (Node + a static server).

In both cases you first need the processed data (`data_cog/` ~800 MB, `data_vector/` ~25 MB)
generated from the source ArcGIS dataset — see [Data](#data).

### Option A — with Docker (recommended)

```bash
git clone https://github.com/HillaryKoros/kyoga.git
cd kyoga

# Generate the processed data (one-off; needs Python + the source ArcGIS dataset)
./prepare_data.sh

# Build the image (data + web build are baked in) and run
docker compose up -d --build
```

Open <http://localhost:8080/kyoga/>.

```bash
docker compose down       # stop
docker compose logs -f    # follow logs
```

### Option B — without Docker

```bash
git clone https://github.com/HillaryKoros/kyoga.git
cd kyoga

# 1. Generate the data (Python venv with the data-prep deps)
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
./prepare_data.sh         # COGs + vectors + stats; symlinks into web/public/

# 2. Build the web app (needs Node 20+)
cd web && npm ci && npm run build && cd ..

# 3. Stage everything in one folder for serving
mkdir -p site
cp -r web/dist/. site/
cp -r data_cog site/data_cog
cp -r data_vector site/data_vector
cp data_cog/stats.json site/stats.json

# 4. Serve it (any static HTTP server with byte-range support works)
python3 -m http.server --directory site 8080
```

Open <http://localhost:8080/kyoga/>.

For *active development* (with hot reload) skip steps 2-4 and run inside `web/`:

```bash
npm install
npm run dev               # http://localhost:5173/kyoga/
```

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
`Flood_Vulnerability/`, and `Floods_Kyoga_basin/Floods_Kyoga_basin.gdb`), run:

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
./prepare_data.sh
```

`prepare_data.sh` runs the three idempotent steps:

| Script | Output |
| --- | --- |
| `convert_to_cog.py`  | `data_cog/**/*.tif` (web-mercator COGs with nodata baked in) |
| `export_vectors.py`  | `data_vector/rivers.geojson`, `study_area.geojson`, `rivers.fgb` |
| `compute_stats.py`   | `data_cog/stats.json` (per-layer p2/p98 + nodata sentinel) |

It also creates symlinks under `web/public/` so the dev server can serve the data.

## Hosting elsewhere

To target a different host for the data (e.g. a CDN), set `VITE_DATA_BASE` at build time:

```bash
VITE_DATA_BASE=https://cdn.example.com/kyoga npm run build
```

Any HTTPS-capable static host with byte-range support works (Nginx, Apache,
S3 + CloudFront, Cloudflare R2, GitHub Pages, etc.).

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
