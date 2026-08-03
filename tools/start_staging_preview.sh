#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${ROOT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-8787}"
PYTHON_BIN="${PYTHON_BIN:-python3}"

echo "Staging TerraNava:"
echo "  Root: $ROOT_DIR"
echo "  URL principal: http://$HOST:$PORT/"
echo "  AquaRisk: http://$HOST:$PORT/aquarisk-ong.html"
echo "  Sitio institucional: http://$HOST:$PORT/terranava-site/"
echo
exec "$PYTHON_BIN" -m http.server "$PORT" --bind "$HOST" --directory "$ROOT_DIR"
