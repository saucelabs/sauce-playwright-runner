#!/bin/bash
set -e

# Run common bundling steps
bash ./scripts/bundle.sh

export PLAYWRIGHT_BROWSERS_PATH=$PWD/bundle/Cache/
export PLAYWRIGHT_SKIP_BROWSER_GC=1

pushd bundle/

# Install browsers for all supported macOS platforms.
# Each platform may have different browser binary directory structures
# (e.g., Chromium uses chrome-mac/ on mac13 vs chrome-mac-arm64/ on mac14/mac15).
# Installing for each platform ensures the correct binaries are available at runtime.
for platform in mac13 mac14 mac15; do
  PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=$platform npx playwright install
  PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=$platform npx playwright install-deps
done
npx playwright --version

popd

# Archive Bundle with symlinks
zip --symlinks -r playwright-macos-amd64.zip bundle/
