#!/usr/bin/env bash
set -euo pipefail

# Genera PMTiles vectoriales a partir de los GeoJSON ya derivados de AquaRisk.
# Requiere: tippecanoe, pmtiles

ROOT_DIR="${ROOT_DIR:-$(pwd)}"
OUT_DIR="${OUT_DIR:-$ROOT_DIR/output/hydrosheds}"
WORK_DIR="${WORK_DIR:-$ROOT_DIR/output/hydrosheds-work}"
REGIONS=(${REGIONS:-eu sa})
HYBAS_LEVELS=(${HYBAS_LEVELS:-4 5 6 7 8})

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Falta el comando requerido: $1" >&2
    exit 1
  }
}

for cmd in tippecanoe pmtiles; do
  need_cmd "$cmd"
done

TMP_DIR="$WORK_DIR/pmtiles-build"
mkdir -p "$TMP_DIR"

hybas_zoom_bounds() {
  case "$1" in
    4) echo "3 6" ;;
    5) echo "4 7" ;;
    6) echo "5 8" ;;
    7) echo "6 9" ;;
    8) echo "7 10" ;;
    *) echo "4 8" ;;
  esac
}

build_pmtiles() {
  local input_geojson="$1"
  local layer_name="$2"
  local min_zoom="$3"
  local max_zoom="$4"
  local output_pmtiles="$5"
  local name="$6"
  local description="$7"
  shift 7

  local output_mbtiles="$TMP_DIR/${name}.mbtiles"
  mkdir -p "$(dirname "$output_pmtiles")"
  rm -f "$output_mbtiles" "$output_pmtiles"

  local common_args=(
    --read-parallel
    --drop-densest-as-needed
    --coalesce-densest-as-needed
    --extend-zooms-if-still-dropping
    --no-tile-stats
    --no-progress-indicator
  )
  tippecanoe \
    -o "$output_mbtiles" \
    --force \
    --layer="$layer_name" \
    --name="$name" \
    --description="$description" \
    --attribution="TerraNava · HydroSHEDS / WWF / USGS" \
    --minimum-zoom="$min_zoom" \
    --maximum-zoom="$max_zoom" \
    "${common_args[@]}" \
    "$@" \
    "$input_geojson"

  pmtiles convert "$output_mbtiles" "$output_pmtiles"
  pmtiles verify "$output_pmtiles"
  rm -f "$output_mbtiles"
}

for region in "${REGIONS[@]}"; do
  rivers_input="$OUT_DIR/hydrorivers/${region}_main.geojson"
  rivers_output="$OUT_DIR/pmtiles/hydrorivers/${region}_main.pmtiles"
  if [[ -f "$rivers_input" ]]; then
    echo "PMTiles HydroRIVERS ${region}"
    build_pmtiles \
      "$rivers_input" \
      "hydrorivers" \
      3 \
      9 \
      "$rivers_output" \
      "hydrorivers-${region}-main" \
      "Red principal HydroRIVERS derivada para AquaRisk (${region})" \
      --include=HYRIV_ID --include=NEXT_DOWN --include=MAIN_RIV --include=LENGTH_KM \
      --include=UPLAND_SKM --include=ORD_FLOW --include=DIS_AV_CMS
  fi

  for level in "${HYBAS_LEVELS[@]}"; do
    level2=$(printf "%02d" "$level")
    hybas_input="$OUT_DIR/hydrobasins/${region}/lev${level2}.geojson"
    hybas_output="$OUT_DIR/pmtiles/hydrobasins/${region}/lev${level2}.pmtiles"
    if [[ ! -f "$hybas_input" ]]; then
      continue
    fi

    read -r min_zoom max_zoom <<< "$(hybas_zoom_bounds "$level")"
    echo "PMTiles HydroBASINS ${region} nivel ${level}"
    build_pmtiles \
      "$hybas_input" \
      "hydrobasins" \
      "$min_zoom" \
      "$max_zoom" \
      "$hybas_output" \
      "hydrobasins-${region}-lev${level2}" \
      "HydroBASINS nivel ${level} derivado para AquaRisk (${region})" \
      --detect-shared-borders \
      --include=HYBAS_ID --include=NEXT_DOWN --include=MAIN_BAS --include=DIST_SINK \
      --include=DIST_MAIN --include=SUB_AREA --include=UP_AREA --include=PFAF_ID \
      --include=ENDO --include=COAST --include=ORDER --include=SORT
  done
done

echo "PMTiles generados en: $OUT_DIR/pmtiles"
