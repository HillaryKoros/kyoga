#!/usr/bin/env bash
# One-shot: regenerate the processed dataset (COGs + vectors + stats).
# Re-runs are idempotent — already-converted COGs are skipped.
#
# Pre-reqs: Python venv with the deps from backend/requirements.txt installed,
# and the source ArcGIS data in Flood_System_Devt/.
#
# Usage:  ./prepare_data.sh

set -euo pipefail
cd "$(dirname "$0")"

PY="${PYTHON:-.venv/bin/python}"
if [ ! -x "$PY" ]; then
  echo "error: $PY not found. Set up the venv first:"
  echo "  python3 -m venv .venv"
  echo "  .venv/bin/pip install -r backend/requirements.txt"
  exit 1
fi

if [ ! -d "Flood_System_Devt" ]; then
  echo "error: Flood_System_Devt/ source data not found. Place the original ArcGIS dataset at the project root."
  exit 1
fi

echo "==> 1/3 Converting GeoTIFFs to web-mercator COGs..."
"$PY" backend/convert_to_cog.py

echo "==> 2/3 Exporting rivers + study area from the geodatabase..."
"$PY" backend/export_vectors.py

echo "==> 3/3 Computing per-layer stats (vmin/vmax + nodata sentinels)..."
"$PY" backend/compute_stats.py

# Make stats.json available to the dev server (and the Docker build copies it too)
mkdir -p frontend/public
cp -f data_cog/stats.json frontend/public/stats.json
echo "==> Wrote frontend/public/stats.json"

# Dev-mode symlinks so vite serves the data at /kyoga/data_cog/* and /kyoga/data_vector/*
ln -sfn ../../data_cog    frontend/public/data_cog
ln -sfn ../../data_vector frontend/public/data_vector
echo "==> Linked frontend/public/{data_cog,data_vector}"

echo
echo "All done. Sizes:"
du -sh data_cog data_vector
