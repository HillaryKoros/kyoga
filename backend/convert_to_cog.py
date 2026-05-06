"""Convert all GeoTIFFs in Flood_Hazard/ and Flood_Vulnerability/ to web-optimized COGs.

For each raster, determine a sensible nodata value (declared, else corner pixel)
and bake it into the COG so web viewers auto-mask outside-basin pixels.
"""
from pathlib import Path
import time
import numpy as np
import rasterio
from rio_cogeo.cogeo import cog_translate
from rio_cogeo.profiles import cog_profiles

ROOT = Path(__file__).parent.parent
SRC_DIRS = [
    ROOT / "Flood_System_Devt" / "Flood_Hazard",
    ROOT / "Flood_System_Devt" / "Flood_Vulnerability",
]
DST_ROOT = ROOT / "data_cog"

profile = cog_profiles.get("deflate")
profile.update({"BIGTIFF": "IF_SAFER"})
config = {"GDAL_NUM_THREADS": "ALL_CPUS"}


def detect_nodata(src_path):
    """Return (nodata_value, integer?). Use declared nodata if present, else corner pixel."""
    with rasterio.open(src_path) as ds:
        if ds.nodata is not None:
            return ds.nodata, np.issubdtype(ds.dtypes[0], np.integer)
        # Read four corner pixels and pick the value if at least 3 agree.
        w, h = ds.width, ds.height
        is_int = np.issubdtype(ds.dtypes[0], np.integer)
        from rasterio.windows import Window
        vals = []
        for y, x in [(0, 0), (0, w - 1), (h - 1, 0), (h - 1, w - 1)]:
            arr = ds.read(1, window=Window(x, y, 1, 1))
            vals.append(arr[0, 0].item())
        from collections import Counter
        bg, count = Counter(vals).most_common(1)[0]
        if count >= 3:
            return bg, is_int
        return None, is_int


DST_ROOT.mkdir(exist_ok=True)
for src_dir in SRC_DIRS:
    dst_dir = DST_ROOT / src_dir.name
    dst_dir.mkdir(exist_ok=True)
    for tif in sorted(src_dir.glob("*.tif")):
        dst = dst_dir / tif.name
        if dst.exists():
            print(f"skip (exists): {dst.relative_to(ROOT)}")
            continue
        nodata, _ = detect_nodata(tif)
        t0 = time.time()
        src_mb = tif.stat().st_size / 1024 / 1024
        print(f"converting {tif.name} ({src_mb:.0f} MB)  nodata={nodata}...", flush=True)
        cog_translate(
            str(tif), str(dst),
            profile, config=config,
            in_memory=False, quiet=True, web_optimized=True,
            nodata=nodata,
        )
        dst_mb = dst.stat().st_size / 1024 / 1024
        print(f"  -> {dst.relative_to(ROOT)}  {dst_mb:.0f} MB  ({time.time()-t0:.0f}s)", flush=True)
print("done")
