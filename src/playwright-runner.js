#!/usr/bin/env node
const {spawn} = require('child_process');
const _ = require('lodash');
const path = require('path');
const fs = require('fs');
const utils = require('./utils');
const {createJobReport} = require('./reporter');
const {prepareNpmEnv, loadRunConfig, escapeXML, preExec} = require('sauce-testrunner-utils');
const {updateExportedValue} = require('sauce-testrunner-utils').saucectl;
const {LOG_FILES, DOCKER_CHROME_PATH} = require('./constants');
const glob = require('glob');
const convert = require('xml-js');
const {runCucumber} = require('./cucumber-runner');
const {TestComposer} = require('@saucelabs/testcomposer');
const stream = require('stream');

const {getAbsolutePath, getArgs, exec} = utils;

// Path has to match the value of the Dockerfile label com.saucelabs.job-info !
const SAUCECTL_OUTPUT_FILE = '/tmp/output.json';

async function createJob(runCfg, testComposer, hasPassed, startTime, endTime, metrics) {
  const cwd = process.cwd();

  const job = await createJobReport(runCfg, testComposer, hasPassed, startTime, endTime);

  if (!job) {
    throw new Error('Unable to create job. Assets won\'t be uploaded.');
  }

  const containerLogFiles = LOG_FILES.filter((path) => fs.existsSync(path));

  // Take the 1st webm video we find and translate it video.mp4
  // We need to translate all .webm to .mp4 and combine them into one video.mp4 due to platform expectations.
  const webmFiles = glob.sync(path.join(runCfg.assetsDir, '**', '*.webm'));
  let videoLocation;
  if (webmFiles.length > 0) {
    videoLocation = path.join(runCfg.assetsDir, 'video.mp4');
    try {
      await exec(`ffmpeg -i ${webmFiles[0]} ${videoLocation}`, {suppressLogs: true});
    } catch (e) {
      videoLocation = null;
      console.error(`Failed to convert ${webmFiles[0]} to mp4: '${e}'`);
    }
  }
  const assets = glob.sync(path.join(runCfg.assetsDir, '**', '*.*'));

  let files = [
    {
      filename: 'console.log',
      data: fs.createReadStream(path.join(cwd, 'console.log')),
    },
    {
      filename: 'sauce-test-report.json',
      data: fs.createReadStream(path.join(runCfg.assetsDir, 'sauce-test-report.json')),
    },
  ];

  if (fs.existsSync(path.join(runCfg.assetsDir, 'junit.xml'))) {
    files.push({
      filename: 'junit.xml',
      data: fs.createReadStream(path.join(runCfg.assetsDir, 'junit.xml')),
    });
  }

  for (const f of containerLogFiles) {
    files.push(
      {
        filename: path.basename(f),
        data: fs.createReadStream(f),
      },
    );
  }

  for (let f of assets) {
    const fileType = path.extname(f);
    let filename = path.basename(f);
    if (fileType === '.png') {
      filename = path.join(path.dirname(f), `${path.basename(path.dirname(f))}-${path.basename(f)}`);
      fs.renameSync(f, filename);
      f = filename;
    }

    files.push(
      {
        filename,
        data: fs.createReadStream(f),
      },
    );
  }

  // Upload metrics
  for (let [, mt] of Object.entries(metrics)) {
    if (_.isEmpty(mt.data)) {
      continue;
    }
    const r = new stream.Readable();
    r.push(JSON.stringify(mt.data, ' ', 2));
    r.push(null);

    files.push(
      {
        filename: mt.name,
        data: r,
      },
    );
  }

  if (videoLocation) {
    files.push(
      {
        filename: path.basename(videoLocation),
        data: fs.createReadStream(videoLocation),
      }
    );
  }

  await testComposer.uploadAssets(
    job.id,
    files
  ).then(
    (resp) => {
      if (resp.errors) {
        for (const err of resp.errors) {
          console.error('Failed to upload asset:', err);
        }
      }
    },
    (e) => console.error('Failed to upload assets:', e.message)
  );

  return job;
}

function getPlatformName(platformName) {
  if (process.platform.toLowerCase() === 'linux') {
    platformName = 'Linux';
  }

  return platformName;
}

function generateJunitfile(sourceFile, suiteName, browserName, platformName) {
  if (!fs.existsSync(sourceFile)) {
    return;
  }

  let opts = {compact: true, spaces: 4};

  const xmlData = fs.readFileSync(sourceFile, 'utf8');
  if (!xmlData) {
    return;
  }
  let result = convert.xml2js(xmlData, opts);
  if (!result.testsuites || !result.testsuites.testsuite) {
    return;
  }

  if (!Array.isArray(result.testsuites.testsuite)) {
    result.testsuites.testsuite = [result.testsuites.testsuite];
  }

  let testsuites = [];
  let totalTests = 0;
  let totalErrs = 0;
  let totalFailures = 0;
  let totalSkipped = 0;
  let totalTime = 0;
  for (let i = 0; i < result.testsuites.testsuite.length; i++) {
    let testsuite = result.testsuites.testsuite[i];
    if (testsuite._attributes) {
      totalTests += +testsuite._attributes.tests || 0;
      totalFailures += +testsuite._attributes.failures || 0;
      totalErrs += +testsuite._attributes.errors || 0;
      totalSkipped += +testsuite._attributes.skipped || 0;
      totalTime += +testsuite._attributes.time || 0;
    }

    // _attributes
    testsuite._attributes = testsuite._attributes || {};
    testsuite._attributes.id = i;
    let timestamp = new Date(+testsuite._attributes.timestamp);
    testsuite._attributes.timestamp = timestamp.toISOString();

    // properties
    testsuite.properties = {
      property: [
        {
          _attributes: {
            name: 'platformName',
            value: getPlatformName(platformName),
          }
        },
        {
          _attributes: {
            name: 'browserName',
            value: browserName,
          }
        }
      ]
    };

    // testcases
    if (!testsuite.testcase) {
      testsuites.push(testsuite);
      continue;
    }
    if (!Array.isArray(testsuite.testcase)) {
      testsuite.testcase = [testsuite.testcase];
    }

    // failure message
    for (let j = 0; j < testsuite.testcase.length; j++) {
      const testcase = testsuite.testcase[j];
      if (testcase.failure) {
        testsuite.testcase[j].failure._cdata = testcase.failure._text || '';
        delete testsuite.testcase[j].failure._text;
      }
    }

    testsuites.push(testsuite);
  }

  result = {
    _declaration: {
      _attributes: {
        version: '1.0',
        encoding: 'utf-8'
      }
    },
    testsuites: {
      _attributes: {
        name: suiteName,
        tests: totalTests,
        failures: totalFailures,
        skipped: totalSkipped,
        errors: totalErrs,
        time: totalTime,
      },
      testsuite: testsuites,
    }
  };

  opts.textFn = escapeXML;
  let xmlResult = convert.js2xml(result, opts);
  fs.writeFileSync(sourceFile, xmlResult);
}

async function runReporter({runCfg, hasPassed, startTime, endTime, metrics}) {
  let pkgVersion = 'unknown';
  try {
    const pkgData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'));
    pkgVersion = pkgData.version;
    // eslint-disable-next-line no-empty
  } catch (e) {
  }

  const testComposer = new TestComposer({
    region: runCfg.sauce.region,
    username: process.env.SAUCE_USERNAME,
    accessKey: process.env.SAUCE_ACCESS_KEY,
    headers: {'User-Agent': `playwright-runner/${pkgVersion}`}
  });

  let job;
  try {
    job = await createJob(runCfg, testComposer, hasPassed, startTime, endTime, metrics);
    console.log(`\nOpen job details page: ${job.url}\n`);
  } catch (e) {
    console.log(`Failed to upload results to Sauce Labs. Reason: ${e.message}`);
  } finally {
    updateExportedValue(SAUCECTL_OUTPUT_FILE, {jobDetailsUrl: job?.url, reportingSucceeded: !!job});
  }
}

async function getCfg(runCfgPath, suiteName) {
  runCfgPath = getAbsolutePath(runCfgPath);
  const runCfg = await loadRunConfig(runCfgPath);

  const suite = _.find(runCfg.suites, ({name}) => name === suiteName);
  if (!suite) {
    throw new Error(`Could not find suite named '${suiteName}'`);
  }
  runCfg.suite = suite;

  const projectPath = path.dirname(runCfgPath);
  if (!fs.existsSync(projectPath)) {
    throw new Error(`Could not find projectPath directory: '${projectPath}'`);
  }
  runCfg.assetsDir = path.join(projectPath, '__assets__');
  if (!fs.existsSync(runCfg.assetsDir)) {
    fs.mkdirSync(runCfg.assetsDir);
  }
  runCfg.junitFile = path.join(runCfg.assetsDir, 'junit.xml');
  runCfg.sauceReportFile = path.join(runCfg.assetsDir, 'sauce-test-report.json');
  runCfg.preExecTimeout = 300;
  runCfg.path = runCfgPath;
  runCfg.projectPath = projectPath;
  if (!runCfg.sauce) {
    runCfg.sauce = {};
  }
  runCfg.sauce.region = runCfg.sauce.region || 'us-west-1';
  runCfg.playwrightOutputFolder = path.join(runCfg.assetsDir, 'test-results');

  return runCfg;
}

async function run(nodeBin, runCfgPath, suiteName) {
  const runCfg = await getCfg(runCfgPath, suiteName);

  const packageInfo = require(path.join(__dirname, '..', 'package.json'));
  console.log(`Sauce Playwright Runner ${packageInfo.version}`);
  console.log(`Running Playwright ${packageInfo.dependencies?.playwright || ''}`);

  let result;
  if (runCfg.Kind === 'playwright-cucumberjs') {
    result = await runCucumber(nodeBin, runCfg);
  } else {
    result = await runPlaywright(nodeBin, runCfg);
    try {
      generateJunitfile(runCfg.junitFile, runCfg.suite.name, runCfg.suite.param.browser, runCfg.suite.platformName);
    } catch (err) {
      console.error(`Failed to generate junit file: ${err}`);
    }
  }

  // If it's a VM, don't try to upload the assets
  if (process.env.SAUCE_VM) {
    return result.hasPassed;
  }

  if (!(process.env.SAUCE_USERNAME && process.env.SAUCE_ACCESS_KEY)) {
    console.log('Skipping asset uploads! Remember to setup your SAUCE_USERNAME/SAUCE_ACCESS_KEY');
    return result.hasPassed;
  }

  await runReporter({
    runCfg,
    hasPassed: result.hasPassed,
    startTime: result.startTime,
    endTime: result.endTime,
    metrics: result.metrics
  });
  return result.hasPassed;
}

async function runPlaywright(nodeBin, runCfg) {
  let excludeParams = ['screenshot-on-failure', 'video', 'slow-mo', 'headless', 'headed'];

  process.env.BROWSER_NAME = runCfg.suite.param.browserName;
  process.env.HEADLESS = runCfg.suite.param.headless;
  process.env.SAUCE_SUITE_NAME = runCfg.suite.name;
  process.env.SAUCE_ARTIFACTS_DIRECTORY = runCfg.assetsDir;
  if (runCfg.suite.param.browserName === 'chrome') {
    excludeParams.push('browser');
  }
  if (!process.env.SAUCE_VM) {
    process.env.BROWSER_PATH = DOCKER_CHROME_PATH;
  }

  if (runCfg.playwright.configFile) {
    const playwrightCfgFile = path.join(runCfg.projectPath, runCfg.playwright.configFile);
    if (fs.existsSync(playwrightCfgFile)) {
      process.env.PLAYWRIGHT_CFG_FILE = playwrightCfgFile;
    } else {
      throw new Error(`Could not find playwright config file: '${playwrightCfgFile}'`);
    }
  }
  const suite = runCfg.suite;

  if (suite.param.project) {
    process.env.project = suite.param.project;
  }

  // Copy our runner's playwright config to a custom location in order to
  // preserve the customer's config which we may want to load in the future
  const configFile = path.join(runCfg.projectPath, 'sauce.config.mjs');
  fs.copyFileSync(path.join(__dirname, 'sauce.config.js'), configFile);

  const defaultArgs = {
    output: runCfg.playwrightOutputFolder,
    config: configFile,
  };

  const playwrightBin = path.join(__dirname, '..', 'node_modules', '@playwright', 'test', 'cli.js');
  const procArgs = [
    playwrightBin, 'test'
  ];

  // Default value for timeout (30min)
  if (!suite.param.globalTimeout) {
    suite.param.timeout = 1800000;
  }
  let args = _.defaultsDeep(defaultArgs, utils.replaceLegacyKeys(suite.param));


  // There is a conflict if the playwright project has a `browser` defined,
  // since the job is launched with the browser set by saucectl, which is now set as the job's metadata.
  const isRunProject = Object.keys(args).find((k) => k === 'project');
  if (isRunProject) {
    excludeParams.push('browser');
  }

  for (let [key, value] of Object.entries(args)) {
    key = utils.toHyphenated(key);
    if (excludeParams.includes(key.toLowerCase()) || value === false) {
      continue;
    }
    procArgs.push(`--${key}`);
    if (value !== true) {
      procArgs.push(value);
    }
  }

  // Thread testMatch as arrays by default.
  // Older versions saucectl are only providing a single value.
  if (!Array.isArray(suite.testMatch)) {
    suite.testMatch = [suite.testMatch];
  }
  procArgs.push(...suite.testMatch);

  args = _.defaultsDeep(suite, args);
  if (args.testIgnore && args.testIgnore.length > 0) {
    process.env.TEST_IGNORE = args.testIgnore;
  }

  runCfg.args = args;

  let env = {
    ...process.env,
    ...suite.env,
    PLAYWRIGHT_JUNIT_OUTPUT_NAME: runCfg.junitFile,
    SAUCE_REPORT_OUTPUT_NAME: runCfg.sauceReportFile,
    FORCE_COLOR: 0,
  };

  utils.setEnvironmentVariables(env);

  // Install NPM dependencies
  let metrics = [];

  // Define node/npm path for execution
  const npmBin = path.join(path.dirname(nodeBin), 'node_modules', 'npm', 'bin', 'npm-cli.js');
  const nodeCtx = { nodePath: nodeBin, npmPath: npmBin };

  // runCfg.path must be set for prepareNpmEnv to find node_modules. :(
  let npmMetrics = await prepareNpmEnv(runCfg, nodeCtx);
  metrics.push(npmMetrics);

  // Run suite preExecs
  if (!await preExec.run(suite, runCfg.preExecTimeout)) {
    return false;
  }

  const playwrightProc = spawn(nodeBin, procArgs, {stdio: 'inherit', cwd: runCfg.projectPath, env});

  const playwrightPromise = new Promise((resolve) => {
    playwrightProc.on('close', (code /*, ...args*/) => {
      const hasPassed = code === 0;
      resolve(hasPassed);
    });
  });

  let startTime, endTime, hasPassed = false;
  try {
    startTime = new Date().toISOString();
    hasPassed = await playwrightPromise;
    endTime = new Date().toISOString();
  } catch (e) {
    console.error(`Could not complete job. Reason: ${e}`);
  }
  return {
    startTime,
    endTime,
    hasPassed,
    metrics,
  };
}

if (require.main === module) {
  const {nodeBin, runCfgPath, suiteName} = getArgs();
  run(nodeBin, runCfgPath, suiteName)
    // eslint-disable-next-line promise/prefer-await-to-then
    .then((passed) => {
      process.exit(passed ? 0 : 1);
    })
    // eslint-disable-next-line promise/prefer-await-to-callbacks
    .catch((err) => {
      console.log(err);
      process.exit(1);
    });
}

module.exports = {run, generateJunitfile, getCfg};
