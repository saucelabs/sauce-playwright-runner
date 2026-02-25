#!/bin/bash
set -e

# Run common bundling steps
bash ./scripts/bundle.sh

export PLAYWRIGHT_BROWSERS_PATH=$PWD/bundle/Cache/
export PLAYWRIGHT_SKIP_BROWSER_GC=1

pushd bundle/

# Install all browsers with mac14 platform override
PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=mac14 npx playwright install
PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=mac14 npx playwright install-deps
npx playwright --version

popd

# Archive Bundle with symlinks
zip --symlinks -r playwright-macos-amd64.zip bundle/
