#!/usr/bin/env bash
set -euo pipefail

# Prepara capas ligeras de HydroBASINS e HydroRIVERS para AquaRisk.
# Genera además datasets locales de clima/histórico por cuenca.
# Puede generar además PMTiles vectoriales para el atlas.
# Requiere: curl, unzip, ogr2ogr, jq, node

ROOT_DIR="${ROOT_DIR:-$(pwd)}"
OUT_DIR="${OUT_DIR:-$ROOT_DIR/output/hydrosheds}"
WORK_DIR="${WORK_DIR:-$ROOT_DIR/output/hydrosheds-work}"
REGIONS=(${REGIONS:-eu sa})
HYBAS_LEVELS=(${HYBAS_LEVELS:-4 5 6 7 8})
HYRIVERS_MIN_UPLAND="${HYRIVERS_MIN_UPLAND:-250}"
GENERATE_PMTILES="${GENERATE_PMTILES:-1}"

mkdir -p "$OUT_DIR" "$WORK_DIR"

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Falta el comando requerido: $1" >&2
    exit 1
  }
}

for cmd in curl unzip ogr2ogr jq node; do
  need_cmd "$cmd"
done

if [[ "$GENERATE_PMTILES" == "1" ]]; then
  need_cmd tippecanoe
  need_cmd pmtiles
fi

download_zip() {
  local url="$1"
  local dest="$2"
  if [[ -f "$dest" ]]; then
    return
  fi
  curl -L --fail --output "$dest" "$url"
}

extract_zip() {
  local zip_path="$1"
  local dest_dir="$2"
  mkdir -p "$dest_dir"
  unzip -oq "$zip_path" -d "$dest_dir"
}

cleanup_path() {
  local target="$1"
  [[ -e "$target" ]] && rm -rf "$target"
}

hybas_tolerance() {
  case "$1" in
    4) echo "0.02" ;;
    5) echo "0.01" ;;
    6) echo "0.005" ;;
    7) echo "0.0025" ;;
    8) echo "0.0015" ;;
    *) echo "0.002" ;;
  esac
}

hybas_clip_extent() {
  case "$1:$2" in
    *) echo "" ;;
  esac
}

prepare_hybas() {
  local region="$1"
  local level="$2"
  local level2
  level2=$(printf "%02d" "$level")
  local zip_url="https://data.hydrosheds.org/file/hydrobasins/standard/hybas_${region}_lev${level2}_v1c.zip"
  local zip_file="$WORK_DIR/hybas_${region}_lev${level2}.zip"
  local unzip_dir="$WORK_DIR/hybas_${region}_lev${level2}"
  local shp="$unzip_dir/hybas_${region}_lev${level2}_v1c.shp"
  local out_region="$OUT_DIR/hydrobasins/$region"
  local out_file="$out_region/lev${level2}.geojson"
  local tol
  tol=$(hybas_tolerance "$level")
  local clip_extent
  clip_extent=$(hybas_clip_extent "$region" "$level")

  mkdir -p "$out_region"
  download_zip "$zip_url" "$zip_file"
  extract_zip "$zip_file" "$unzip_dir"

  if [[ -n "$clip_extent" ]]; then
    ogr2ogr \
      -f GeoJSON "$out_file" "$shp" \
      -dialect SQLite \
      -sql "SELECT HYBAS_ID, NEXT_DOWN, MAIN_BAS, DIST_SINK, DIST_MAIN, SUB_AREA, UP_AREA, PFAF_ID, ENDO, COAST, \"ORDER\", SORT, geometry FROM hybas_${region}_lev${level2}_v1c" \
      -lco RFC7946=YES \
      -lco COORDINATE_PRECISION=5 \
      -clipsrc $clip_extent \
      -simplify "$tol"
  else
    ogr2ogr \
      -f GeoJSON "$out_file" "$shp" \
      -dialect SQLite \
      -sql "SELECT HYBAS_ID, NEXT_DOWN, MAIN_BAS, DIST_SINK, DIST_MAIN, SUB_AREA, UP_AREA, PFAF_ID, ENDO, COAST, \"ORDER\", SORT, geometry FROM hybas_${region}_lev${level2}_v1c" \
      -lco RFC7946=YES \
      -lco COORDINATE_PRECISION=5 \
      -simplify "$tol"
  fi

  cleanup_path "$zip_file"
  cleanup_path "$unzip_dir"
}

prepare_hyrivers() {
  local region="$1"
  local zip_url="https://data.hydrosheds.org/file/HydroRIVERS/HydroRIVERS_v10_${region}_shp.zip"
  local zip_file="$WORK_DIR/hyriv_${region}.zip"
  local unzip_dir="$WORK_DIR/hyriv_${region}"
  local shp="$unzip_dir/HydroRIVERS_v10_${region}_shp/HydroRIVERS_v10_${region}.shp"
  local out_dir="$OUT_DIR/hydrorivers"
  local out_file="$out_dir/${region}_main.geojson"

  mkdir -p "$out_dir"
  download_zip "$zip_url" "$zip_file"
  extract_zip "$zip_file" "$unzip_dir"

  ogr2ogr \
    -f GeoJSON "$out_file" "$shp" \
    -dialect SQLite \
    -sql "SELECT HYRIV_ID, NEXT_DOWN, MAIN_RIV, LENGTH_KM, DIST_DN_KM, DIST_UP_KM, CATCH_SKM, UPLAND_SKM, ENDORHEIC, DIS_AV_CMS, ORD_STRA, ORD_CLAS, ORD_FLOW, HYBAS_L12, geometry FROM HydroRIVERS_v10_${region} WHERE UPLAND_SKM >= ${HYRIVERS_MIN_UPLAND}" \
    -lco RFC7946=YES \
    -lco COORDINATE_PRECISION=5 \
    -simplify 0.001

  cleanup_path "$zip_file"
  cleanup_path "$unzip_dir"
}

write_manifest() {
  local manifest_dir="$OUT_DIR/manifest"
  mkdir -p "$manifest_dir"

  {
    echo '{'
    echo '  "regions": {'
    local first_region=1
    for region in "${REGIONS[@]}"; do
      [[ $first_region -eq 1 ]] || echo ','
      first_region=0
      printf '    "%s": {\n' "$region"
      echo '      "hydrobasins": ['
      local first_level=1
      for level in "${HYBAS_LEVELS[@]}"; do
        local level2
        level2=$(printf "%02d" "$level")
        [[ $first_level -eq 1 ]] || echo ','
        first_level=0
        printf '        "/aquarisk-data/hydrobasins/%s/lev%s.geojson"' "$region" "$level2"
      done
      echo
      echo '      ],'
      if [[ "$GENERATE_PMTILES" == "1" ]]; then
        echo '      "hydrobasins_pmtiles": ['
        local first_level_pm=1
        for level in "${HYBAS_LEVELS[@]}"; do
          local level2_pm
          level2_pm=$(printf "%02d" "$level")
          [[ $first_level_pm -eq 1 ]] || echo ','
          first_level_pm=0
          printf '        "/aquarisk-data/pmtiles/hydrobasins/%s/lev%s.pmtiles"' "$region" "$level2_pm"
        done
        echo
        echo '      ],'
      fi
      printf '      "hydrorivers": "/aquarisk-data/hydrorivers/%s_main.geojson"\n' "$region"
      if [[ "$GENERATE_PMTILES" == "1" ]]; then
        printf '      ,"hydrorivers_pmtiles": "/aquarisk-data/pmtiles/hydrorivers/%s_main.pmtiles"\n' "$region"
      fi
      echo -n '    }'
    done
    echo
    echo '  }'
    echo '}'
  } > "$manifest_dir/atlas.json"

  jq . "$manifest_dir/atlas.json" > "$manifest_dir/atlas.pretty.json"
  mv "$manifest_dir/atlas.pretty.json" "$manifest_dir/atlas.json"
}

for region in "${REGIONS[@]}"; do
  for level in "${HYBAS_LEVELS[@]}"; do
    echo "Preparando HydroBASINS ${region} nivel ${level}"
    prepare_hybas "$region" "$level"
  done
  echo "Preparando HydroRIVERS ${region}"
  prepare_hyrivers "$region"
done

if [[ "$GENERATE_PMTILES" == "1" ]]; then
  echo "Generando PMTiles vectoriales"
  ROOT_DIR="$ROOT_DIR" OUT_DIR="$OUT_DIR" WORK_DIR="$WORK_DIR" REGIONS="${REGIONS[*]}" HYBAS_LEVELS="${HYBAS_LEVELS[*]}" \
    "$ROOT_DIR/tools/build_vector_pmtiles.sh"
fi

write_manifest

echo "Generando datasets climáticos locales versionados"
ROOT_DIR="$ROOT_DIR" node "$ROOT_DIR/tools/build_local_climate_datasets.mjs"

echo "Capas generadas en: $OUT_DIR"
