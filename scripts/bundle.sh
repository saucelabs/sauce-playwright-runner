set -e
echo "Using: $(which node)"
rm -rf ./bundle/
mkdir ./bundle/
export PLAYWRIGHT_BROWSERS_PATH=$PWD/bundle/Cache/
echo $PLAYWRIGHT_BROWSERS_PATH
cp -r ./src/ ./bundle/src/
cp -r bin/ bundle/bin/
cp package.json bundle/package.json
cp package-lock.json bundle/package-lock.json
cp "$(which node)" bundle/

pushd bundle/

npm cache clean --force
npm i --production
npx playwright install
npx playwright install-deps
npx playwright --version
# TODO: Add "saucectl" tests here
popd

# DEVX-560: Add missing vcruntime140_1.dll
# Related to:
# - https://github.com/microsoft/playwright/issues/4293
# - https://github.com/microsoft/playwright/pull/4973
# The upgrade to playwright 1.8.0 does not fix the missing
# DLL issue. As a workaround, we decided to ship it within
# the bundle to avoid modifiying the system image.
cp -n ./libs/vcruntime140_1.dll ${PLAYWRIGHT_BROWSERS_PATH}/firefox-*/firefox/
