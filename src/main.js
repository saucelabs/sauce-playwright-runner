#!/usr/bin/env node
const yargs = require('yargs/yargs');
const fs = require('fs');
const { spawn, execSync } = require('child_process');
const _ = require('lodash');
const path = require('path');
const { shouldRecordVideo, getAbsolutePath, loadRunConfig, toHyphenated } = require('./utils');

async function run (nodeBin, runCfgPath, suiteName) {
  runCfgPath = getAbsolutePath(runCfgPath);
  const runCfg = await loadRunConfig(runCfgPath);
  const cwd = path.dirname(runCfgPath);
  let defaultArgs = {
    param: {
      headful: true,
      video: shouldRecordVideo(),
    },
    reporter: 'junit,line',
  };
  let env = {...process.env};
  if (process.env.SAUCE_VM) {
    defaultArgs = _.defaultsDeep(defaultArgs, {
      output: path.join(cwd, '__assets__'),
    });
    env.FOLIO_JUNIT_OUTPUT_NAME = path.join(cwd, '__assets__', 'junit.xml');
  }

  let args = _.defaultsDeep(defaultArgs, runCfg.folio);
  
  const suite = _.find(runCfg.suites, ({name}) => name === suiteName);
  if (!suite) {
    throw new Error(`Could not find suite named 'suiteName'`);
  }
  args = _.defaultsDeep(args, suite);

  const folioBin = path.join(__dirname, '..', 'node_modules', '.bin', 'folio');

  const procArgs = [];
  for (let [key, value] of Object.entries(args)) {
    key = toHyphenated(key);
    if (key.toLowerCase() === 'name') {
      continue;
    }
    if (key === 'param') {
      procArgs.push(`--param`);
      for (let [paramName, paramValue] of Object.entries(value)) {
        procArgs.push(`${paramName}=${paramValue}`);
      }
    } else {
      procArgs.push(`--${key}`);
      procArgs.push(value);
    }
  }

  // Add the node binary that's currently being used to the path
  const isWindows = process.platform === 'win32';
  const pathKey = isWindows ? 'Path': 'PATH';
  env[pathKey] = `${path.dirname(nodeBin)}:${env[pathKey]}`;

  // Run the folio binary
  const folioProc = spawn(folioBin, procArgs, {stdio: 'inherit', cwd, env, shell: true});
  folioProc.on('close', (code) => {
    process.exit(code);
  });
}

if (require.main === module) {
    const argv = yargs(process.argv.slice(2))
      .command('$0', 'the default command')
      .option('runCfgPath', {
        alias: 'r',
        type: 'string',
        description: 'Path to sauce runner json',
      })
      .option('suiteName', {
        alias: 's',
        type: 'string',
        description: 'Select the suite to run'
      })
      .demandOption(['runCfgPath', 'suiteName'])
      .argv;
  const { runCfgPath, suiteName } = argv;
  const nodeBin = process.argv[0];
  run(nodeBin, runCfgPath, suiteName);
}