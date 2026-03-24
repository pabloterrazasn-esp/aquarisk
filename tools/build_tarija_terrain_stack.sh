#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_DIR="$ROOT_DIR/aquarisk-data/dem/tarija"
LOCAL_SRC_DIR="$DATA_DIR/source"
SRC_DIR="${SRC_DIR:-$LOCAL_SRC_DIR}"
WORK_DIR="$DATA_DIR/work"
RELIEF_DIR="$DATA_DIR/relief"
SLOPE_DIR="$DATA_DIR/slope"
CLEANUP_SOURCE_HGT="${CLEANUP_SOURCE_HGT:-auto}"

mkdir -p "$SRC_DIR" "$WORK_DIR" "$RELIEF_DIR" "$SLOPE_DIR"

if [[ "$CLEANUP_SOURCE_HGT" == "auto" ]]; then
  if [[ "$SRC_DIR" == "$LOCAL_SRC_DIR" ]]; then
    CLEANUP_SOURCE_HGT="1"
  else
    CLEANUP_SOURCE_HGT="0"
  fi
fi

MUNICIPAL_SOURCE="$ROOT_DIR/aquarisk-data/risk/bolivia/municipios.v1.geojson"
BUFFER_DEG="${BUFFER_DEG:-0.18}"
MIN_ZOOM="${MIN_ZOOM:-8}"
MAX_ZOOM="${MAX_ZOOM:-10}"
EPSG_LOCAL="${EPSG_LOCAL:-32720}"
TARGET_RES_M="${TARGET_RES_M:-90}"
LAST_VERIFIED_AT="${LAST_VERIFIED_AT:-2026-03-10}"
SOURCE_PRIORITY="${SOURCE_PRIORITY:-oficial_primero_con_fallback_abierto_trazable}"

read -r MIN_LON MIN_LAT MAX_LON MAX_LAT <<<"$(python3 - <<'PY' "$MUNICIPAL_SOURCE" "$BUFFER_DEG"
import json, math, sys
path, buffer_deg = sys.argv[1], float(sys.argv[2])
with open(path) as fh:
    data = json.load(fh)
coords = []
target_municipalities = {"Tarija", "San Lorenzo", "Uriondo"}
def walk(node):
    if isinstance(node[0], (int, float)):
        coords.append(node)
    else:
        for child in node:
            walk(child)
for feature in data["features"]:
    props = feature.get("properties", {})
    if props.get("department") != "Tarija" or props.get("municipality") not in target_municipalities:
        continue
    walk(feature["geometry"]["coordinates"])
if not coords:
    raise SystemExit("No se encontraron municipios base Tarija/San Lorenzo/Uriondo")
xs = [c[0] for c in coords]
ys = [c[1] for c in coords]
print(
    f"{min(xs) - buffer_deg:.6f} {min(ys) - buffer_deg:.6f} "
    f"{max(xs) + buffer_deg:.6f} {max(ys) + buffer_deg:.6f}"
)
PY
)"

TILE_CODES=()
while IFS= read -r line; do
  [[ -n "$line" ]] && TILE_CODES+=("$line")
done < <(python3 - <<'PY' "$MIN_LON" "$MIN_LAT" "$MAX_LON" "$MAX_LAT"
import math, sys
min_lon, min_lat, max_lon, max_lat = map(float, sys.argv[1:])
lon_start = math.floor(min_lon)
lon_end = math.ceil(max_lon) - 1
lat_start = math.floor(min_lat)
lat_end = math.ceil(max_lat) - 1
for lat in range(lat_start, lat_end + 1):
    for lon in range(lon_start, lon_end + 1):
        ns = "N" if lat >= 0 else "S"
        ew = "E" if lon >= 0 else "W"
        print(f"{ns}{abs(lat):02d}/{ns}{abs(lat):02d}{ew}{abs(lon):03d}")
PY
)

echo "Tarija terrain bbox: $MIN_LON $MIN_LAT $MAX_LON $MAX_LAT"
echo "Skadi tiles: ${TILE_CODES[*]}"

for code in "${TILE_CODES[@]}"; do
  lat_dir="${code%/*}"
  tile_name="${code#*/}"
  url="https://elevation-tiles-prod.s3.amazonaws.com/skadi/${lat_dir}/${tile_name}.hgt.gz"
  gz_path="$SRC_DIR/${tile_name}.hgt.gz"
  hgt_path="$SRC_DIR/${tile_name}.hgt"
  if [[ ! -f "$gz_path" && ! -f "$hgt_path" ]]; then
    echo "Descargando $tile_name"
    curl -L --fail --retry 3 --retry-delay 2 -o "$gz_path" "$url"
  fi
  if [[ ! -f "$hgt_path" && -f "$gz_path" ]]; then
    echo "Descomprimiendo $tile_name"
    gzip -dc "$gz_path" > "$hgt_path"
  fi
  rm -f "$gz_path"
done

DEM_VRT="$WORK_DIR/tarija-dem.vrt"
DEM_UTM="$WORK_DIR/tarija-dem-utm.tif"
HILLSHADE="$WORK_DIR/tarija-hillshade-utm.tif"
SLOPE="$WORK_DIR/tarija-slope-utm.tif"
SLOPE_COLOR="$WORK_DIR/tarija-slope-color-utm.tif"
SLOPE_COLOR_RAMP="$WORK_DIR/tarija-slope-ramp.txt"

gdalbuildvrt -overwrite "$DEM_VRT" "$SRC_DIR"/*.hgt

gdalwarp \
  -overwrite \
  -t_srs "EPSG:${EPSG_LOCAL}" \
  -te_srs EPSG:4326 \
  -te "$MIN_LON" "$MIN_LAT" "$MAX_LON" "$MAX_LAT" \
  -tr "$TARGET_RES_M" "$TARGET_RES_M" \
  -r bilinear \
  -dstnodata -9999 \
  -multi \
  -wo NUM_THREADS=ALL_CPUS \
  -co TILED=YES \
  -co COMPRESS=DEFLATE \
  "$DEM_VRT" "$DEM_UTM"

gdaldem hillshade "$DEM_UTM" "$HILLSHADE" \
  -multidirectional \
  -compute_edges \
  -of GTiff \
  -co TILED=YES \
  -co COMPRESS=DEFLATE

gdaldem slope "$DEM_UTM" "$SLOPE" \
  -compute_edges \
  -p \
  -of GTiff \
  -co TILED=YES \
  -co COMPRESS=DEFLATE

cat > "$SLOPE_COLOR_RAMP" <<'EOF'
0 248 250 252 0
3 248 250 252 120
12 222 235 209 150
25 244 208 140 185
50 220 148 93 210
80 173 78 67 235
100 133 41 51 255
nv 0 0 0 0
EOF

gdaldem color-relief "$SLOPE" "$SLOPE_COLOR_RAMP" "$SLOPE_COLOR" \
  -alpha \
  -of GTiff \
  -co TILED=YES \
  -co COMPRESS=DEFLATE

rm -rf "$RELIEF_DIR"/[0-9]* "$SLOPE_DIR"/[0-9]* "$RELIEF_DIR"/tilemapresource.xml "$SLOPE_DIR"/tilemapresource.xml

gdal2tiles.py --xyz --processes=4 --tiledriver=PNG -w none -z "${MIN_ZOOM}-${MAX_ZOOM}" "$HILLSHADE" "$RELIEF_DIR"
gdal2tiles.py --xyz --processes=4 --tiledriver=WEBP -w none -z "${MIN_ZOOM}-${MAX_ZOOM}" "$SLOPE_COLOR" "$SLOPE_DIR"

cat > "$RELIEF_DIR/manifest.v1.json" <<EOF
{
  "version": "v1",
  "layer": "tarija_relief",
  "label": "Relieve Tarija (DEM)",
  "country": "Bolivia",
  "coverage_level": "Tarija regional",
  "service_level": "L1",
  "source_priority": "$SOURCE_PRIORITY",
  "last_verified_at": "$LAST_VERIFIED_AT",
  "tile_url": "/aquarisk-data/dem/tarija/relief/{z}/{x}/{y}.png",
  "bounds": [$MIN_LAT, $MIN_LON, $MAX_LAT, $MAX_LON],
  "min_zoom": $MIN_ZOOM,
  "max_zoom": $MAX_ZOOM,
  "opacity": 0.48,
  "attribution": "SRTM skadi public domain derivatives served by TerraNava",
  "source_label": "SRTM 30 m (skadi) remuestreado a ${TARGET_RES_M} m para stack web Tarija",
  "method": "Hillshade derivado TerraNava desde SRTM skadi recortado, reproyectado y remuestreado para lectura web.",
  "period": "Topografia estatica",
  "resolution": "${TARGET_RES_M} m",
  "recommended_use": "Contexto cartografico y lectura morfometrica regional.",
  "limits": "No equivale por si solo a modelacion hidrologica ni mapa de amenaza.",
  "notes": [
    "Hillshade derivado TerraNava para lectura morfometrica regional y local.",
    "No equivale por si solo a modelacion hidrologica ni mapa de amenaza."
  ]
}
EOF

cat > "$SLOPE_DIR/manifest.v1.json" <<EOF
{
  "version": "v1",
  "layer": "tarija_slope",
  "label": "Pendiente Tarija",
  "country": "Bolivia",
  "coverage_level": "Tarija regional",
  "service_level": "L2",
  "source_priority": "$SOURCE_PRIORITY",
  "last_verified_at": "$LAST_VERIFIED_AT",
  "tile_url": "/aquarisk-data/dem/tarija/slope/{z}/{x}/{y}.webp",
  "bounds": [$MIN_LAT, $MIN_LON, $MAX_LAT, $MAX_LON],
  "min_zoom": $MIN_ZOOM,
  "max_zoom": $MAX_ZOOM,
  "opacity": 0.78,
  "attribution": "SRTM skadi public domain derivatives served by TerraNava",
  "source_label": "Pendiente porcentual derivada TerraNava desde SRTM 30 m remuestreado a ${TARGET_RES_M} m",
  "method": "Pendiente porcentual derivada desde DEM remuestreado y clasificada para lectura hidromorfologica.",
  "period": "Topografia estatica",
  "resolution": "${TARGET_RES_M} m",
  "recommended_use": "Diagnostico orientativo de relieve y respuesta hidromorfologica.",
  "limits": "No debe leerse como mapa directo de riesgo ni sustituye verificacion local.",
  "classes_pct": [0, 3, 12, 25, 50, 80],
  "notes": [
    "La capa expresa pendiente porcentual por clases para lectura hidromorfologica.",
    "No debe leerse como mapa directo de riesgo."
  ]
}
EOF

cat > "$DATA_DIR/summary.v1.json" <<EOF
{
  "version": "v1",
  "generated_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "scope": "Tarija · San Lorenzo · Uriondo",
  "country": "Bolivia",
  "coverage_level": "Tarija regional",
  "service_level": "L2",
  "source_priority": "$SOURCE_PRIORITY",
  "last_verified_at": "$LAST_VERIFIED_AT",
  "bbox": {
    "minLon": $MIN_LON,
    "minLat": $MIN_LAT,
    "maxLon": $MAX_LON,
    "maxLat": $MAX_LAT
  },
  "source_label": "Tarija terrain stack TerraNava",
  "dem_source": "SRTM 30 m skadi remuestreado a ${TARGET_RES_M} m",
  "local_projection": "EPSG:${EPSG_LOCAL}",
  "recommended_use": "Lectura de relieve, pendiente y apoyo a informes preliminares.",
  "limits": "Derivados ligeros para web; no equivale a DEM oficial de proyecto ni a modelacion calibrada.",
  "products": {
    "relief": "/aquarisk-data/dem/tarija/relief/manifest.v1.json",
    "slope": "/aquarisk-data/dem/tarija/slope/manifest.v1.json"
  },
  "zoom_range": [$MIN_ZOOM, $MAX_ZOOM],
  "notes": [
    "El stack cubre la unidad hidrologica regional donde cae Tarija/Guadalquivir con un pequeno buffer.",
    "Se usa para lectura de relieve y pendiente dentro de AquaRisk."
  ]
}
EOF

if [[ "$CLEANUP_SOURCE_HGT" == "1" ]]; then
  rm -f "$SRC_DIR"/*.hgt
fi
rm -f "$WORK_DIR"/*.tif "$WORK_DIR"/*.vrt "$WORK_DIR"/*.txt

echo "Tarija terrain stack generado en $DATA_DIR"
