#!/usr/bin/env node
const yargs = require('yargs/yargs');
const { spawn } = require('child_process');
const _ = require('lodash');
const path = require('path');
const { shouldRecordVideo, getAbsolutePath, loadRunConfig } = require('./utils');

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
  if (process.env.SAUCE_VM) {
    defaultArgs = _.defaultsDeep(defaultArgs, {
      output: path.join(cwd, '__assets__'),
    });
  }

  const args = _.defaultsDeep(defaultArgs, runCfg.folio);
  // TODO: Add the 'suite' here

  const folioBin = path.join(__dirname, '..', 'node_modules', '.bin', 'folio');
  const procArgs = [folioBin];


  for (let [key, value] of Object.entries(args)) {
    key = key.toLowerCase();
    if (key === 'name') {
      continue;
    }
    if (key === 'param') {
      procArgs.push(`--param`);
      for (let [paramName, paramValue] of Object.entries(value)) {
        procArgs.push(`${paramName}=${paramValue}`);
      }
    } else {
      // TODO: Validate the key here?
      procArgs.push(`--${key}`);
      procArgs.push(value);
    }
    
  }

  const folioProc = spawn(nodeBin, procArgs, {stdio: 'inherit', cwd});
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