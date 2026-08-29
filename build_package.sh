#!/usr/bin/env bash
#
# Zma Printer Agent — cross-platform build script.
#
# Builds installers / portable packages for Windows and macOS into ./release.
#
#   Windows -> release/*-windows-x64.exe       (NSIS installer — recommended for most users)
#             release/*-windows-x64-PORTABLE.exe (portable — no install needed, just run)
#   macOS   -> release/*-mac-x64.dmg           (macOS disk image)
#
# Usage:
#   ./build_package.sh
#
# The script asks which platform you want to build for:
#   1) Windows  2) macOS  3) Both
#
# Notes:
#   - Building for macOS (dmg) must be done on a Mac.
#   - Building the Windows .exe from macOS is possible with Wine installed, but
#     building on a Windows machine is recommended for production artifacts.
#   - The GitHub Actions workflow in .github/workflows/build.yml builds both
#     platforms automatically on every release.

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

echo ""
echo "=============================================="
echo "  Zma Printer Agent — Build Script"
echo "=============================================="
echo ""
echo "Which platform do you want to build for?"
echo "  1) Windows (NSIS installer + portable .exe)"
echo "  2) macOS (DMG)"
echo "  3) Both (Windows + macOS)"
echo ""
read -rp "Enter your choice [1/2/3]: " PLATFORM

case "$PLATFORM" in
  1) TARGETS="--win" ;;
  2) TARGETS="--mac" ;;
  3) TARGETS="--win --mac" ;;
  *)
    echo "Invalid choice '$PLATFORM'. Please choose 1, 2, or 3." >&2
    exit 1
    ;;
esac

echo ""
echo "Installing dependencies (including dev dependencies)..."
NODE_ENV=development npm install --include=dev --legacy-peer-deps

echo ""
echo "Running typecheck and building the renderer/main/preload bundles..."
npm run build

echo ""
echo "Packaging: ${TARGETS}..."
# Disable automatic code-signing discovery so unsigned builds (the default for
# open-source projects) do not try to download signing tools.
export CSC_IDENTITY_AUTO_DISCOVERY=false

npx electron-builder ${TARGETS} --publish never

echo ""
echo "=============================================="
echo "  Build complete. Artifacts in ./release:"
echo "=============================================="
if [ -d release ]; then
  ls -1h release/*.exe release/*.dmg 2>/dev/null || ls -1 release 2>/dev/null || echo "No artifacts found."
else
  echo "No release/ directory — check the output above for errors."
fi
echo ""

echo "Which file should I share with others?"
echo "  Windows: use the *-windows-x64.exe  (NSIS installer — recommended)"
echo "           or the *-PORTABLE.exe      (no install needed, run directly)"
echo "  macOS:   use the *-mac-x64.dmg      (drag to Applications)"
