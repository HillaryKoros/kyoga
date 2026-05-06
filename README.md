# Kyoga Basin Flood Risk Viewer

Open-source web map for flood **hazard**, **vulnerability**, and **risk** layers
covering the Lake Kyoga basin (Uganda).

Built with **React + Vite + MapLibre GL** + **Cloud-Optimized GeoTIFFs** read
directly in the browser via HTTP byte-range requests. No server-side tile
renderer required.

## Live demo

<http://149.102.153.66:8080/kyoga/>

## Project layout

```
kyoga/
├── frontend/             React + Vite + MapLibre GL app
│   ├── src/
│   │   ├── App.tsx       map + state
│   │   ├── layers.ts     18-layer registry
│   │   ├── colormaps.ts  palettes (CSS gradients + COG-protocol URLs)
│   │   └── components/   LayerPanel, MapControls, Legend, PixelInspector
│   └── public/           static assets (stats.json copied here at build time)
├── backend/              Python data-prep scripts (not a runtime backend)
│   ├── convert_to_cog.py      source GeoTIFFs -> web-mercator COGs (nodata baked in)
│   ├── export_vectors.py      .gdb -> GeoJSON / FlatGeobuf
│   ├── compute_stats.py       per-COG vmin/vmax + nodata sentinels
│   └── requirements.txt
├── data_cog/             generated COGs + stats.json (NOT in git)
├── data_vector/          generated GeoJSON / FlatGeobuf (NOT in git)
├── prepare_data.sh       one-shot wrapper: runs all 3 backend scripts
├── Dockerfile            multi-stage: vite build -> nginx serve
├── nginx.conf            static host with CORS + range request support
└── docker-compose.yml    convenience for `docker compose up`
```

## Quick start

There are two ways to run the app — **with Docker** (recommended, single
command) or **without Docker** (Node + a static server).

In both cases you first need the processed data (`data_cog/` ~800 MB,
`data_vector/` ~25 MB) generated from the source ArcGIS dataset — see
[Data](#data).

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
docker compose down        # stop
docker compose logs -f     # follow logs
```

### Option B — without Docker

```bash
git clone https://github.com/HillaryKoros/kyoga.git
cd kyoga

# 1. Generate the data
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt
./prepare_data.sh          # writes data_cog/, data_vector/, frontend/public/stats.json

# 2. Build the web app (needs Node 20+)
cd frontend && npm ci && npm run build && cd ..

# 3. Stage one folder for serving
mkdir -p site
cp -r frontend/dist/. site/
cp -r data_cog       site/data_cog
cp -r data_vector    site/data_vector

# 4. Serve it (any static HTTP server with byte-range support works)
python3 -m http.server --directory site 8080
```

Open <http://localhost:8080/kyoga/>.

For active development with hot reload, skip steps 2-4 and run inside `frontend/`:

```bash
npm install
npm run dev                # http://localhost:5173/kyoga/
```

## Data

The processed `data_cog/` and `data_vector/` are **not in git** — they're
regenerated from the original ArcGIS dataset (`Flood_System_Devt/`).

`prepare_data.sh` runs three idempotent steps:

| Script | Output |
| --- | --- |
| `backend/convert_to_cog.py`  | `data_cog/**/*.tif` (web-mercator COGs with nodata baked in) |
| `backend/export_vectors.py`  | `data_vector/rivers.geojson`, `study_area.geojson`, `rivers.fgb` |
| `backend/compute_stats.py`   | `data_cog/stats.json` (per-layer p2/p98 + nodata sentinel) |

It also creates symlinks under `frontend/public/` so the dev server can serve
the data, and copies `stats.json` into the same dir.

## Hosting on a different origin

To fetch the data from a separate host (e.g. a CDN), set `VITE_DATA_BASE` at
build time:

```bash
VITE_DATA_BASE=https://cdn.example.com/kyoga npm run build
```

Any HTTPS-capable static host with byte-range support works (Nginx, Apache,
S3 + CloudFront, Cloudflare R2, GitHub Pages, etc.).

## Features

- 18 raster layers grouped into Composite / Hazard / Vulnerability
- Per-layer auto color stretch (p2/p98 of valid pixels), proper nodata masking
- Floating map controls: basemap (OSM | Satellite), opacity, zoom, colormap, overlay toggles
- Click anywhere on the map → pixel inspector reads each visible COG
- Hover rivers / boundary → property tooltip
- Compact bottom-center legend with CSS gradients

## Stack (all open source)

- React 19, Vite 8, TypeScript
- MapLibre GL JS (BSD-3)
- `@geomatico/maplibre-cog-protocol` (MIT) — COG raster protocol for MapLibre
- `geotiff` (MIT) — pixel reads via range requests
- nginx (BSD-2) — static host
- Font Awesome Free (CC BY 4.0) — icons
