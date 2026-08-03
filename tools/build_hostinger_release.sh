#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${ROOT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
STAMP="${STAMP:-$(date +"%Y%m%d-%H%M%S")}"
RELEASE_DIR="${RELEASE_DIR:-$ROOT_DIR/releases/hostinger}"
ZIP_PATH="${ZIP_PATH:-$RELEASE_DIR/aquarisk-hostinger-${STAMP}.zip}"
LATEST_LINK="${LATEST_LINK:-$RELEASE_DIR/latest-aquarisk-hostinger.zip}"

mkdir -p "$RELEASE_DIR"

ROOT_DIR="$ROOT_DIR" ZIP_PATH="$ZIP_PATH" "$ROOT_DIR/tools/package_hostinger_bundle.sh"

ln -sfn "$ZIP_PATH" "$LATEST_LINK"

echo
echo "Release lista:"
echo "  ZIP: $ZIP_PATH"
echo "  Link latest: $LATEST_LINK"
