#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${ROOT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
SOURCE_HTML="${SOURCE_HTML:-$ROOT_DIR/aquarisk-ong.html}"
DATA_DIR="${DATA_DIR:-$ROOT_DIR/aquarisk-data}"
API_DIR="${API_DIR:-$ROOT_DIR/aquarisk-api}"
DEPLOY_DIR="${DEPLOY_DIR:-$ROOT_DIR/hostinger-deploy}"
DEPLOY_HTML="${DEPLOY_HTML:-$DEPLOY_DIR/aquarisk/index.html}"
README_FILE="${README_FILE:-$DEPLOY_DIR/README-HOSTINGER.txt}"
ZIP_PATH="${ZIP_PATH:-$ROOT_DIR/aquarisk-hostinger.zip}"

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Falta el comando requerido: $1" >&2
    exit 1
  }
}

for cmd in cp mktemp rm zip du; do
  need_cmd "$cmd"
done

[[ -f "$SOURCE_HTML" ]] || {
  echo "No existe el HTML fuente: $SOURCE_HTML" >&2
  exit 1
}

[[ -d "$DATA_DIR" ]] || {
  echo "No existe la carpeta de datos: $DATA_DIR" >&2
  exit 1
}

[[ -d "$API_DIR" ]] || {
  echo "No existe la carpeta de API: $API_DIR" >&2
  exit 1
}

[[ -f "$README_FILE" ]] || {
  echo "No existe el README de despliegue: $README_FILE" >&2
  exit 1
}

mkdir -p "$(dirname "$DEPLOY_HTML")"
cp "$SOURCE_HTML" "$DEPLOY_HTML"

stage_dir="$(mktemp -d "${TMPDIR:-/tmp}/aquarisk-hostinger.XXXXXX")"
cleanup() {
  rm -rf "$stage_dir"
}
trap cleanup EXIT

mkdir -p "$stage_dir/aquarisk"
cp "$DEPLOY_HTML" "$stage_dir/aquarisk/index.html"
cp "$README_FILE" "$stage_dir/README-HOSTINGER.txt"
cp -R "$DATA_DIR" "$stage_dir/aquarisk-data"
cp -R "$API_DIR" "$stage_dir/aquarisk-api"

rm -f "$ZIP_PATH"
(
  cd "$stage_dir"
  zip -qr "$ZIP_PATH" aquarisk aquarisk-data aquarisk-api README-HOSTINGER.txt
)

echo "Bundle Hostinger generado:"
echo "  HTML: $DEPLOY_HTML"
echo "  Datos: $DATA_DIR"
echo "  API: $API_DIR"
echo "  ZIP: $ZIP_PATH"
echo "Tamaño del ZIP:"
du -sh "$ZIP_PATH"
