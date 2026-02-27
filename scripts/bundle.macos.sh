#!/bin/bash
set -e

# Run common bundling steps
bash ./scripts/bundle.sh

export PLAYWRIGHT_BROWSERS_PATH=$PWD/bundle/Cache/
export PLAYWRIGHT_SKIP_BROWSER_GC=1

pushd bundle/

# Install ARM64 browsers natively (build machine is macos-15 ARM).
# This guarantees chrome-mac-arm64/, firefox-arm64/, etc. are created correctly.
npx playwright install chromium chromium-headless-shell firefox webkit
npx playwright install-deps chromium firefox webkit

# Install x86 browsers for mac13 (macOS 12/13) compatibility.
# PLAYWRIGHT_SKIP_BROWSER_GC=1 ensures the ARM64 browsers above aren't cleaned up.
PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=mac13 npx playwright install chromium chromium-headless-shell firefox
PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=mac13 npx playwright install-deps chromium firefox

npx playwright --version

popd

# Archive Bundle with symlinks preserved (required for macOS .app bundles)
zip --symlinks -r playwright-macos-amd64.zip bundle/
