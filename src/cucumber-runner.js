const fs = require('fs');
const glob = require('glob');
const { spawn } = require('child_process');
const path = require('path');
const { prepareNpmEnv } = require('sauce-testrunner-utils');
const { DESIRED_BROWSER, CUCUMBER_FRAMEWORK } = require('./constants');
const utils = require('./utils');

function buildArgs (runCfg, cucumberBin) {
  const cwd = process.cwd();
  let paths = [];
  runCfg.suite.options.paths.forEach((p) => {
    paths.push(path.join(cwd, p));
  });
  const procArgs = [
    cucumberBin,
    ...paths,
    '--publish-quiet',
    '--require-module', 'ts-node/register',
    '--format', '@saucelabs/cucumber-reporter',
    '--format-options', JSON.stringify(buildFormatOption(runCfg)),
  ];
  if (runCfg.cucumber.config) {
    procArgs.push('-c');
    procArgs.push(path.join(cwd, runCfg.cucumber.config));
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
    procArgs.push(path.join(cwd, req));
  });
  runCfg.suite.options.import?.forEach((im) => {
    procArgs.push('-i');
    procArgs.push(path.join(cwd, im));
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

  return procArgs;
}

async function runCucumber (nodeBin, runCfg) {
  utils.setEnvironmentVariables(runCfg.suite.env || {});
  process.env.BROWSER_NAME = runCfg.suite.browserName;
  process.env.BROWSER_OPTIONS = runCfg.suite.browserOptions;

  // Install NPM dependencies
  let metrics = [];
  let npmMetrics = await prepareNpmEnv(runCfg);
  metrics.push(npmMetrics);

  let cucumberBin = path.join(__dirname, '..', 'node_modules', '@cucumber', 'cucumber', 'bin', 'cucumber-js');

  const procArgs = buildArgs(runCfg, cucumberBin);
  const startTime = new Date().toISOString();
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
    tag: cfg.sauce.metadata?.tags,
  };
}

async function uploadJobAssets (api, runCfg, jobId) {
  let assets = [
    {
      filename: 'console.log',
      data: fs.readFileSync(process.env.CONSOLE_LOG),
    },
    {
      filename: 'sauce-test-report.json',
      data: fs.readFileSync(path.join(process.cwd(), 'sauce-test-report.json')),
    },
  ];
  const attachments = glob.sync(path.join(runCfg.assetsDir, '**/*'));
  attachments.forEach((f) => {
    assets.push(
      {
        filename: path.basename(f),
        data: fs.readFileSync(f),
      },
    );
  });

  await Promise.all([
    // Casting assets as string[] to fit the definition for files. Will refine this later.
    api?.uploadJobAssets(jobId, { files: assets }).then(
      (resp) => {
        if (resp.errors) {
          for (const err of resp.errors) {
            console.error(err);
          }
        }
      },
      (e) => console.log('Upload failed:', e.stack)
    )
  ]);
}

async function createCucumberJob (api, runCfg, result) {
  if (!process.env.SAUCE_USERNAME || !process.env.SAUCE_ACCESS_KEY) {
    return;
  }

  let browserVersion = runCfg.suite.browserVersion ||
    (DESIRED_BROWSER.toLowerCase() === 'firefox' ? process.env.FF_VER : process.env.CHROME_VER);

  const body = {
    name: runCfg.suite.name,
    user: process.env.SAUCE_USERNAME,
    startTime: result.startTime,
    endTime: result.endTime,
    framework: CUCUMBER_FRAMEWORK,
    frameworkVersion: runCfg.cucumber.version,
    status: 'complete',
    suite: runCfg.suite.name,
    errors: [],
    passed: result.hasPassed,
    tags: runCfg.sauce.metadata?.tags,
    build: runCfg.sauce.metadata?.build,
    browserName: runCfg.suite.browserName,
    browserVersion,
    platformName: process.env.IMAGE_NAME + ':' + process.env.IMAGE_TAG,
    saucectlVersion: process.env.SAUCE_SAUCECTL_VERSION,
  };

  try {
    const resp = await api.createJob(body);
    const sessionId = resp.ID;
    if (sessionId) {
      await uploadJobAssets(api, runCfg, sessionId);
    }
    return sessionId;
  } catch (e) {
    console.error('Create job failed: ', e.stack);
  }
}

module.exports = { runCucumber, createCucumberJob };