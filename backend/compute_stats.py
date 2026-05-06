"""Compute per-COG stats: detect background sentinel and p2/p98 of valid pixels.

Output: data_cog/stats.json — used by app.py for color stretching and nodata masking.
"""
from pathlib import Path
import json
import numpy as np
import rasterio

ROOT = Path(__file__).parent.parent
COG_ROOT = ROOT / "data_cog"

stats = {}
for tif in sorted(COG_ROOT.rglob("*.tif")):
    with rasterio.open(tif) as ds:
        # Read a downsampled overview for speed (target ~1000 px wide).
        scale = max(1, ds.width // 1000)
        arr = ds.read(
            1,
            out_shape=(ds.height // scale, ds.width // scale),
            resampling=rasterio.enums.Resampling.nearest,
        )

        # Detect the most common corner value — likely the outside-basin sentinel.
        corners = [arr[0, 0], arr[0, -1], arr[-1, 0], arr[-1, -1]]
        # majority vote, ignoring NaN
        corner_vals = [int(c) if not np.isnan(c) else None for c in corners] if np.issubdtype(arr.dtype, np.integer) else corners
        from collections import Counter
        counter = Counter(corners)
        bg_val, bg_count = counter.most_common(1)[0]
        bg_val = float(bg_val) if not np.isnan(bg_val) else None

        # Build mask: drop declared nodata + the corner sentinel.
        mask = np.ones_like(arr, dtype=bool)
        if ds.nodata is not None:
            mask &= arr != ds.nodata
        if bg_val is not None and bg_count >= 3:  # at least 3/4 corners agree
            mask &= arr != bg_val
        if np.issubdtype(arr.dtype, np.floating):
            mask &= np.isfinite(arr)

        valid = arr[mask]
        if valid.size == 0:
            continue
        p2, p50, p98 = np.percentile(valid, [2, 50, 98])
        rel = str(tif.relative_to(COG_ROOT))
        stats[rel] = {
            "vmin": float(p2),
            "vmax": float(p98),
            "median": float(p50),
            "min": float(valid.min()),
            "max": float(valid.max()),
            "background": bg_val if (bg_val is not None and bg_count >= 3) else None,
            "declared_nodata": ds.nodata,
        }
        print(f"{rel:55s}  vmin={p2:>10.3g}  vmax={p98:>10.3g}  bg={stats[rel]['background']}")

out = COG_ROOT / "stats.json"
out.write_text(json.dumps(stats, indent=2))
print(f"\nwrote {out}")
