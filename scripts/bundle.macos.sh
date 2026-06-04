#!/bin/bash
set -e

# Run common bundling steps
bash ./scripts/bundle.sh

export PLAYWRIGHT_SKIP_BROWSER_GC=1

# Final cache location used by the bundle at runtime
FINAL_CACHE="$PWD/bundle/Cache"

pushd bundle/

# =============================================================================
# Multi-arch bundling strategy: Install ARM64 and x64 browsers into separate
# isolated directories, then merge into the final Cache/.
#
# This avoids fragile INSTALLATION_COMPLETE marker manipulation and the
# backup/restore dance needed when both architectures share a single cache.
#
# - Chromium & Headless Shell: arm64 and x64 extract to different subdirectory
#   names (chrome-mac-arm64/ vs chrome-mac-x64/), so they coexist after merge.
# - Firefox: Both architectures extract to the same path (firefox/), so only
#   x64 is kept — it runs on Apple Silicon via Rosetta 2.
# - WebKit: Only arm64 is installed (mac14-arm64 for macOS 14/15 compat).
#   Playwright 1.58+ dropped webkit support for mac13.
# =============================================================================

# --- Step 1: Install ARM64 browsers into isolated directory ---
echo "--- Step 1: Installing ARM64 browsers (mac14-arm64) ---"
export PLAYWRIGHT_BROWSERS_PATH="$PWD/Cache-arm64"
export PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=mac14-arm64
npx playwright install chromium chromium-headless-shell webkit
npx playwright install-deps chromium webkit
unset PLAYWRIGHT_HOST_PLATFORM_OVERRIDE

# --- Step 1b: Install macOS 15 ARM64 WebKit ---
# WebKit ships a distinct binary per macOS major version: macOS 14 pins revision
# 2251 (folder webkit_mac14-arm64_special-2251/) while macOS 15 uses revision 2272
# (folder webkit-2272/). The mac14 build does NOT satisfy macOS 15, which looks for
# webkit-2272/ and otherwise fails with "Executable doesn't exist". Because the two
# folder names differ, both builds coexist in the cache after the merge.
# (Chromium/Firefox arm64 share one binary across mac14/mac15, so they need no equivalent.)
echo "--- Step 1b: Installing mac15-arm64 WebKit ---"
export PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=mac15-arm64
npx playwright install webkit
unset PLAYWRIGHT_HOST_PLATFORM_OVERRIDE

# --- Step 2: Install x64 browsers into isolated directory ---
echo "--- Step 2: Installing x64 browsers (mac13) ---"
export PLAYWRIGHT_BROWSERS_PATH="$PWD/Cache-intel"
export PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=mac13
npx playwright install chromium chromium-headless-shell firefox
npx playwright install-deps chromium firefox
unset PLAYWRIGHT_HOST_PLATFORM_OVERRIDE

# --- Step 3: Merge both caches into the final Cache/ directory ---
echo "--- Step 3: Merging ARM64 and x64 browsers into final cache ---"
rm -rf "$FINAL_CACHE"
mkdir -p "$FINAL_CACHE"

# Use x64 (Intel) as the base layer
cp -a Cache-intel/* "$FINAL_CACHE/"

# Overlay ARM64 on top — rsync --ignore-existing adds arm64 subdirectories
# (chrome-mac-arm64/, webkit-*/) without overwriting x64 files or markers.
rsync -a --ignore-existing Cache-arm64/ "$FINAL_CACHE/"

# Clean up temporary caches
rm -rf Cache-arm64 Cache-intel

export PLAYWRIGHT_BROWSERS_PATH="$FINAL_CACHE"

# --- Verify ---
echo "--- Verification: final cache contents ---"
find "$FINAL_CACHE" -maxdepth 2 -type d | sort
npx playwright --version

popd

# Archive Bundle with symlinks preserved (required for macOS .app bundles)
zip --symlinks -r playwright-macos-amd64.zip bundle/
