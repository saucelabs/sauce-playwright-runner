const { spawn } = require('child_process');
const path = require('path');
const { prepareNpmEnv, preExec } = require('sauce-testrunner-utils');
const utils = require('./utils');

function buildArgs (runCfg, cucumberBin) {
  let paths = [];
  runCfg.suite.options.paths.forEach((p) => {
    paths.push(path.join(runCfg.projectPath, p));
  });
  const procArgs = [
    cucumberBin,
    ...paths,
    '--publish-quiet',
    '--require-module', 'ts-node/register',
    '--format', '@saucelabs/cucumber-reporter',
    '--format-options', JSON.stringify(buildFormatOption(runCfg)),
  ];
  if (runCfg.suite.options.config) {
    procArgs.push('-c');
    procArgs.push(path.join(runCfg.projectPath, runCfg.suite.options.config));
  }
  if (runCfg.suite.options.name) {
    procArgs.push('--name');
    procArgs.push(runCfg.suite.options.name);
  }
  if (runCfg.suite.options.backtrace) {
    procArgs.push('-b');
    procArgs.push('true');
  }
  runCfg.suite.options.require?.forEach((req) => {
    procArgs.push('-r');
    procArgs.push(path.join(runCfg.projectPath, req));
  });
  runCfg.suite.options.import?.forEach((im) => {
    procArgs.push('-i');
    procArgs.push(path.join(runCfg.projectPath, im));
  });
  runCfg.suite.options.tags?.forEach((tag) => {
    procArgs.push('-t');
    procArgs.push(tag);
  });
  runCfg.suite.options.format?.forEach((format) => {
    procArgs.push('--format');
    const opts = format.split(':');
    if (opts.length === 2) {
      procArgs.push(`${opts[0]}:${path.join(runCfg.assetsDir, opts[1])}`);
    } else {
      procArgs.push(format);
    }
  });

  console.log('procArgs: ', procArgs.join(' '));
  return procArgs;
}

async function runCucumber (nodeBin, runCfg) {
  process.env.BROWSER_NAME = runCfg.suite.browserName;
  process.env.BROWSER_OPTIONS = runCfg.suite.browserOptions;
  process.env.SAUCE_SUITE_NAME = runCfg.suite.name;
  process.env.SAUCE_ARTIFACTS_DIRECTORY = runCfg.assetsDir;
  utils.setEnvironmentVariables({
    ...process.env,
    ...runCfg.suite.env,
    SAUCE_REPORT_OUTPUT_NAME: runCfg.sauceReportFile,
  });

  // Install NPM dependencies
  let metrics = [];
  let npmMetrics = await prepareNpmEnv(runCfg);
  metrics.push(npmMetrics);

  const startTime = new Date().toISOString();
  // Run suite preExecs
  if (!await preExec.run(runCfg.suite, runCfg.preExecTimeout)) {
    return {
      startTime,
      endTime: new Date().toISOString(),
      hasPassed: false,
      metrics,
    };
  }

  const cucumberBin = path.join(runCfg.projectPath, 'node_modules', '@cucumber', 'cucumber', 'bin', 'cucumber-js');
  const procArgs = buildArgs(runCfg, cucumberBin);
  const proc = spawn(nodeBin, procArgs, {stdio: 'inherit', env: process.env});

  let passed = false;
  const procPromise = new Promise((resolve) => {
    proc.stdout?.on('data', (data) => resolve(data.toString()));
    proc.on('error', (err) => {
      throw new Error(err.message);
    });
    proc.on('close', (code, /*, ...args*/) => {
      const passed = code === 0;
      resolve(passed);
    });
  }).catch((err) => console.error(err));

  const endTime = new Date().toISOString();
  try {
    passed = await procPromise;
  } catch (e) {
    console.error(`Could not complete job. Reason: ${e}`);
  }

  return {
    startTime,
    endTime,
    hasPassed: passed,
    metrics,
  };
}

function buildFormatOption (cfg) {
  return {
    upload: false,
    suiteName: cfg.suite.name,
    build: cfg.sauce.metadata?.build,
    tags: cfg.sauce.metadata?.tags,
    outputFile: path.join(cfg.assetsDir, 'sauce-test-report.json'),
  };
}

module.exports = { runCucumber };