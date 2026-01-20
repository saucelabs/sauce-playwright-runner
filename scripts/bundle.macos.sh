#!/bin/bash
set -e

# Run common bundling steps
bash ./scripts/bundle.sh

# Install Webkit for macOS with mac13 platform override
export PLAYWRIGHT_BROWSERS_PATH=$PWD/bundle/Cache/
export PLAYWRIGHT_SKIP_BROWSER_GC=1
PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=mac13 npx playwright install webkit

# Archive Bundle with symlinks
zip --symlinks -r playwright-macos-amd64.zip bundle/
