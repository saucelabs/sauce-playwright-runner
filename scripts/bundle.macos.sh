#!/bin/bash
set -e

# Run common bundling steps
bash ./scripts/bundle.sh

export PLAYWRIGHT_BROWSERS_PATH=$PWD/bundle/Cache/
export PLAYWRIGHT_SKIP_BROWSER_GC=1

pushd bundle/

# Install chromium and firefox with mac13 platform override
PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=mac13 npx playwright install chromium chromium-headless-shell firefox
PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=mac13 npx playwright install-deps chromium firefox

# WebKit is not supported on mac13 or earlier in Playwright 1.58.1 (void 0 in registry).
# Install webkit separately for mac14 (forward-compatible with mac15).
# Both mac14 and mac15 share the same revision (2248) and directory (webkit-2248),
# so only one install is needed. Using mac14 for broadest compatibility.
PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=mac14 npx playwright install webkit
PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=mac14 npx playwright install-deps webkit

npx playwright --version

popd

# Archive Bundle with symlinks
zip --symlinks -r playwright-macos-amd64.zip bundle/
