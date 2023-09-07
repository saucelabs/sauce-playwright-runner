set -e
echo "Using: $(which node)"
export PLAYWRIGHT_BROWSERS_PATH=$PWD/bundle/Cache/
echo $PLAYWRIGHT_BROWSERS_PATH
NODE_VERSION=$(node --version)
NODE_URL="https://nodejs.org/dist/$NODE_VERSION/node-$NODE_VERSION-darwin-x64.tar.gz"
NODE_TAR_FILE="node-$NODE_VERSION-darwin-x64.tar.gz"
NODE_DIR="node-$NODE_VERSION-darwin-x64"

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
tar xf $NODE_TAR_FILE
mv $NODE_DIR bundle/node_dir

pushd bundle/

npm cache clean --force
npm ci --omit=dev


npx playwright install
npx playwright install-deps
npx playwright --version

popd
