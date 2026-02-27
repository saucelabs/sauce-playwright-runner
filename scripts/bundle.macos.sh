#!/bin/bash
set -e

# Run common bundling steps
bash ./scripts/bundle.sh

export PLAYWRIGHT_BROWSERS_PATH=$PWD/bundle/Cache/
export PLAYWRIGHT_SKIP_BROWSER_GC=1

pushd bundle/

# --- Step 1: Install ARM64 browsers for macOS 14/15 (Apple Silicon) ---
# Use mac14-arm64 override instead of native mac15-arm64 so that webkit is
# compiled against the macOS 14 SDK. This binary is forward-compatible with
# macOS 15 but the reverse is not true (mac15 webkit uses symbols absent on 14).
# NOTE: Firefox is deliberately excluded here. Both arm64 and x64 Firefox
# extract to the same directory path (firefox-<rev>/firefox/), so only one
# can exist. We install x64 Firefox in Step 3, which runs natively on Intel
# Macs and via Rosetta 2 on Apple Silicon.
PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=mac14-arm64 npx playwright install chromium chromium-headless-shell webkit
PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=mac14-arm64 npx playwright install-deps chromium webkit

# --- Step 2: Remove INSTALLATION_COMPLETE markers ---
# Playwright marks each browser revision directory with an INSTALLATION_COMPLETE
# file after downloading. Before downloading, it checks for this marker and
# silently skips if present — even when the needed platform variant (e.g. x64)
# is missing. Removing the markers allows the x86 install below to download
# into the same revision directories alongside the ARM64 files.
find "$PLAYWRIGHT_BROWSERS_PATH" -name "INSTALLATION_COMPLETE" -delete

# --- Step 3: Install x86 browsers for macOS 12/13 (Intel) ---
# Chromium/chromium-headless-shell use platform-specific subdirectories
# (chrome-mac-arm64/ vs chrome-mac-x64/) so both coexist in one revision dir.
# Firefox and ffmpeg share the same subdirectory for both architectures, so
# this step overwrites the ARM64 copies with x64 — which is intentional since
# x64 binaries run on Apple Silicon via Rosetta 2.
PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=mac13 npx playwright install chromium chromium-headless-shell firefox
PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=mac13 npx playwright install-deps chromium firefox

npx playwright --version

popd

# Archive Bundle with symlinks preserved (required for macOS .app bundles)
zip --symlinks -r playwright-macos-amd64.zip bundle/
