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
npm ci --production
npx playwright install
npx playwright install-deps
npx playwright --version
# TODO: Add "saucectl" tests here
popd
