#!/usr/bin/env bash
#
# Build macOS and Windows packages into ./release.
#
# macOS  -> release/*.dmg
# Windows -> release/*.exe (NSIS installer)
#
# Usage:
#   ./build_package.sh
#
# Notes:
#   - Windows packages can be built from macOS using electron-builder's
#     Wine-based builder when Wine is installed.
#   - For a production Windows build, building on a Windows runner is recommended.
#     The GitHub Actions workflow in .github/workflows/build.yml does exactly that.

set -euo pipefail

cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Error: node is not installed." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is not installed." >&2
  exit 1
fi

echo "Installing dependencies (including dev dependencies)..."
NODE_ENV=development npm install --include=dev --legacy-peer-deps

echo "Running typecheck and building the renderer/main/preload bundles..."
npm run build

echo "Packaging macOS and Windows installers into ./release..."
npx electron-builder --mac --win --publish never

echo ""
echo "Build complete. Artifacts:"
ls -1 release 2>/dev/null || echo "No artifacts found in release/."
