"""Export vector layers from the geodatabase to GeoJSON for web use."""
from pathlib import Path
import geopandas as gpd

ROOT = Path(__file__).parent
GDB = ROOT / "Flood_System_Devt" / "Floods_Kyoga_basin" / "Floods_Kyoga_basin.gdb"
DST = ROOT / "data_vector"
DST.mkdir(exist_ok=True)

print("reading River_Polyline...", flush=True)
rivers = gpd.read_file(GDB, layer="River_Polyline", engine="pyogrio")
print(f"  {len(rivers)} features, CRS={rivers.crs}")

rivers = rivers.to_crs("EPSG:4326")
keep = [c for c in ["arcid", "Shape_Length"] if c in rivers.columns]
rivers = rivers[keep + ["geometry"]]
rivers["geometry"] = rivers.geometry.simplify(0.0002, preserve_topology=False)
rivers = rivers[~rivers.geometry.is_empty]

out = DST / "rivers.geojson"
rivers.to_file(out, driver="GeoJSON")
print(f"wrote {out.relative_to(ROOT)}  ({out.stat().st_size/1024/1024:.1f} MB)")

out_fgb = DST / "rivers.fgb"
rivers.to_file(out_fgb, driver="FlatGeobuf")
print(f"wrote {out_fgb.relative_to(ROOT)}  ({out_fgb.stat().st_size/1024/1024:.1f} MB)")

print("computing study area boundary...")
import rasterio
from rasterio.warp import transform_bounds
from shapely.geometry import box
ref = ROOT / "data_cog" / "Flood_Hazard" / "Flood_Hazard.tif"
with rasterio.open(ref) as ds:
    b = transform_bounds(ds.crs, "EPSG:4326", *ds.bounds)
boundary = gpd.GeoDataFrame({"name": ["Kyoga basin study area"]}, geometry=[box(*b)], crs="EPSG:4326")
out_b = DST / "study_area.geojson"
boundary.to_file(out_b, driver="GeoJSON")
print(f"wrote {out_b.relative_to(ROOT)}  bounds={b}")
print("done")
