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

cp package.json bundle/package.json
cp package-lock.json bundle/package-lock.json
cp "$(which node)" bundle/


pushd bundle/

npm cache clean --force
npm ci --omit=dev

# TODO: Add "saucectl" tests here

popd
