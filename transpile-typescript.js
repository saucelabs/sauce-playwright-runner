const glob = require('glob');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
let { exec } = require('child_process');
const exists = promisify(fs.exists);
exec = promisify(exec);

(async function () {
    const tsPaths = path.join(process.env.HOME_DIR, 'tests', '**/*.ts');
    const pathsToTypescriptFiles = await glob(tsPaths);
    const tsconfigPath = path.join(path.join(process.env.HOME_DIR, 'tests', 'tsconfig.json'));
    let res;
    if (await exists(tsconfigPath)) {
      console.log(`Compiling Typescript files from tsconfig '${tsconfigPath}'`);
      res = await exec(`npx tsc -p ${tsconfigPath}`);
      if (res.stderr) {
          throw res.stderr;
      }
    }
})().catch((e) => {
    console.error(`Error: '${e}'`);
    process.exit(1);
});