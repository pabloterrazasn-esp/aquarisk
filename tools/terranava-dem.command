#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

./tools/dem.sh menu

echo
read -r -p "Pulsa Enter para cerrar..." _
