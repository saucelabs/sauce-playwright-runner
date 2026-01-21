#!/bin/bash
set -e

# Run common bundling steps
bash ./scripts/bundle.sh

export PLAYWRIGHT_BROWSERS_PATH=$PWD/bundle/Cache/

pushd bundle/

# Install browsers for Windows
npx playwright install
npx playwright install-deps
npx playwright --version

popd

# DEVX-560: Add missing vcruntime140_1.dll
# Related to:
# - https://github.com/microsoft/playwright/issues/4293
# - https://github.com/microsoft/playwright/pull/4973
# The upgrade to playwright 1.8.0 does not fix the missing
# DLL issue. As a workaround, we decided to ship it within
# the bundle to avoid modifiying the system image.
cp -n ./libs/vcruntime140_1.dll ${PLAYWRIGHT_BROWSERS_PATH}/firefox-*/firefox/
