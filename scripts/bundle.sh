set -e
echo "Using: $(which node)"
export PLAYWRIGHT_BROWSERS_PATH=$PWD/bundle/Cache/
echo $PLAYWRIGHT_BROWSERS_PATH

rm -rf ./bundle/
mkdir ./bundle/

# Build src
npm ci
npm run build
cp -r ./lib/ ./bundle/lib/

cp -r bin/ bundle/bin/
cp package.json bundle/package.json
cp package-lock.json bundle/package-lock.json
cp $(which node) bundle/
wget "https://nodejs.org/dist/v18.17.1/node-v18.17.1-darwin-arm64.tar.gz"
tar xf node-v18.17.1-darwin-arm64.tar.gz
mv node-v18.17.1-darwin-arm64 bundle/node

pushd bundle/

npm cache clean --force
npm ci --omit=dev


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
