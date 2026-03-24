#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${ROOT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
DATA_BASE="${TERRANAVA_DATA_BASE:-/Volumes/Crucial X10/Data/TerraNava}"

RAW_DIR="$DATA_BASE/raw"
PROCESSED_DIR="$DATA_BASE/processed"
TILES_DIR="$DATA_BASE/tiles"
MODELS_DIR="$DATA_BASE/models"
STAGING_DIR="$DATA_BASE/staging"
REFERENCE_DIR="$DATA_BASE/reference"
QA_DIR="$DATA_BASE/qa"
RELEASES_DIR="$DATA_BASE/releases"

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Falta el comando requerido: $1" >&2
    exit 1
  }
}

need_cmd ln
need_cmd mkdir
need_cmd mv
need_cmd rm
need_cmd readlink

mkdir -p \
  "$RAW_DIR/hydrosheds" \
  "$PROCESSED_DIR" \
  "$TILES_DIR" \
  "$MODELS_DIR" \
  "$STAGING_DIR/hydrosheds-work" \
  "$REFERENCE_DIR/media-source" \
  "$QA_DIR/playwright" \
  "$RELEASES_DIR/hostinger"

link_path() {
  local source_path="$1"
  local target_path="$2"

  mkdir -p "$(dirname "$source_path")" "$(dirname "$target_path")"

  if [[ -L "$source_path" ]]; then
    local current_target
    current_target="$(readlink "$source_path")"
    if [[ "$current_target" == "$target_path" ]]; then
      return
    fi
    rm "$source_path"
  fi

  if [[ -e "$source_path" && ! -e "$target_path" ]]; then
    mv "$source_path" "$target_path"
  elif [[ -e "$source_path" && -e "$target_path" ]]; then
    if [[ -d "$source_path" && -d "$target_path" ]] && [[ -z "$(find "$target_path" -mindepth 1 -maxdepth 1 -print -quit 2>/dev/null)" ]]; then
      rmdir "$target_path"
      mv "$source_path" "$target_path"
    elif [[ -d "$source_path" && -d "$target_path" ]] && [[ -z "$(find "$source_path" -mindepth 1 -maxdepth 1 -print -quit 2>/dev/null)" ]]; then
      rm -rf "$source_path"
    else
      echo "No se puede enlazar $source_path porque origen y destino ya existen." >&2
      exit 1
    fi
  fi

  ln -s "$target_path" "$source_path"
}

link_path "$ROOT_DIR/data/hydrosheds" "$RAW_DIR/hydrosheds"
link_path "$ROOT_DIR/output/hydrosheds-work" "$STAGING_DIR/hydrosheds-work"
link_path "$ROOT_DIR/output/playwright" "$QA_DIR/playwright"
link_path "$ROOT_DIR/workspace-data" "$DATA_BASE"
link_path "$ROOT_DIR/qa" "$QA_DIR"
link_path "$ROOT_DIR/releases" "$RELEASES_DIR"
link_path "$ROOT_DIR/media-source" "$REFERENCE_DIR/media-source"

echo "Workspace TerraNava preparado:"
printf '  %-24s %s\n' "workspace-data" "$ROOT_DIR/workspace-data"
printf '  %-24s %s\n' "qa" "$ROOT_DIR/qa"
printf '  %-24s %s\n' "releases" "$ROOT_DIR/releases"
printf '  %-24s %s\n' "media-source" "$ROOT_DIR/media-source"
printf '  %-24s %s\n' "data/hydrosheds" "$ROOT_DIR/data/hydrosheds"
printf '  %-24s %s\n' "output/hydrosheds-work" "$ROOT_DIR/output/hydrosheds-work"
printf '  %-24s %s\n' "output/playwright" "$ROOT_DIR/output/playwright"
