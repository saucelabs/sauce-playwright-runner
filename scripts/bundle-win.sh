set -e
echo "Using: $(which node)"
export PLAYWRIGHT_BROWSERS_PATH=$PWD/bundle/Cache/
echo $PLAYWRIGHT_BROWSERS_PATH
NODE_VERSION=$(node --version)
NODE_URL="https://nodejs.org/dist/$NODE_VERSION/node-$NODE_VERSION-win-x64.zip"
NODE_TAR_FILE="node-$NODE_VERSION-win-x64.zip"
NODE_DIR="node-$NODE_VERSION-win-x64"

rm -rf ./bundle/
mkdir ./bundle/

# Build src
npm ci
npm run build
cp -r ./lib/ ./bundle/lib/

cp -r bin/ bundle/bin/
cp package.json bundle/package.json
cp package-lock.json bundle/package-lock.json
curl -o $NODE_TAR_FILE $NODE_URL
unzip $NODE_TAR_FILE
mv $NODE_DIR bundle/node

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
