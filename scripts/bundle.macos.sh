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
echo "--- Step 1: Installing ARM64 browsers (mac14-arm64) ---"
export PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=mac14-arm64
npx playwright install chromium chromium-headless-shell webkit
npx playwright install-deps chromium webkit
unset PLAYWRIGHT_HOST_PLATFORM_OVERRIDE

echo "--- Step 2: Backing up ARM64 Chromium ---"
# --- Step 2: Back up ARM64 Chromium files ---
# Playwright deletes the entire browser revision directory (e.g. chromium-1208/)
# when INSTALLATION_COMPLETE is missing. We must preserve the arm64 subdirectories
# before the x64 install wipes them out.
ARM64_BACKUP=$(mktemp -d)
find "$PLAYWRIGHT_BROWSERS_PATH" -type d -name "chrome-mac-arm64" -exec cp -a {} "$ARM64_BACKUP/chrome-mac-arm64" \;
find "$PLAYWRIGHT_BROWSERS_PATH" -type d -name "chrome-headless-shell-mac-arm64" -exec cp -a {} "$ARM64_BACKUP/chrome-headless-shell-mac-arm64" \;

echo "--- Step 3: Removing INSTALLATION_COMPLETE markers for chromium/headless-shell ---"
# --- Step 3: Remove INSTALLATION_COMPLETE markers for chromium & headless-shell only ---
# Only remove markers for browsers that will be re-downloaded in Step 4.
# Preserving webkit's marker prevents Playwright from trying to reinstall it
# for mac13, which is no longer supported in Playwright 1.58+.
find "$PLAYWRIGHT_BROWSERS_PATH" -path "*/chromium-*/INSTALLATION_COMPLETE" -delete
find "$PLAYWRIGHT_BROWSERS_PATH" -path "*/chromium_headless_shell-*/INSTALLATION_COMPLETE" -delete

echo "--- Step 4: Installing x86 browsers (mac13) ---"
# --- Step 4: Install x86 browsers for macOS 12/13 (Intel) ---
# Firefox and ffmpeg share the same subdirectory for both architectures, so
# this step overwrites the ARM64 copies with x64 — which is intentional since
# x64 binaries run on Apple Silicon via Rosetta 2.
export PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=mac13
npx playwright install chromium chromium-headless-shell firefox
npx playwright install-deps chromium firefox
unset PLAYWRIGHT_HOST_PLATFORM_OVERRIDE

echo "--- Step 5: Restoring ARM64 Chromium ---"
# --- Step 5: Restore ARM64 Chromium files ---
# Copy arm64 subdirectories back into the browser revision directories so both
# architectures coexist (chrome-mac-arm64/ alongside chrome-mac-x64/).
for chromium_dir in "$PLAYWRIGHT_BROWSERS_PATH"/chromium-*/; do
  if [ -d "$ARM64_BACKUP/chrome-mac-arm64" ]; then
    cp -a "$ARM64_BACKUP/chrome-mac-arm64" "$chromium_dir/"
  fi
done
for headless_dir in "$PLAYWRIGHT_BROWSERS_PATH"/chromium_headless_shell-*/; do
  if [ -d "$ARM64_BACKUP/chrome-headless-shell-mac-arm64" ]; then
    cp -a "$ARM64_BACKUP/chrome-headless-shell-mac-arm64" "$headless_dir/"
  fi
done
rm -rf "$ARM64_BACKUP"

npx playwright --version

popd

# Archive Bundle with symlinks preserved (required for macOS .app bundles)
zip --symlinks -r playwright-macos-amd64.zip bundle/
