npx tsc -p ./tests/fixtures/typescript/tsconfig.json
for file in ./tests/e2e/*.yml
do
    echo $file
    $SAUCE_CTL_BINARY run --config  $file
done