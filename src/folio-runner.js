#!/usr/bin/env node
const { spawn } = require('child_process');
const _ = require('lodash');
const path = require('path');
const utils = require('./utils');
const { createJobReportV2, createJobReport } = require('./reporter');
const { prepareNpmEnv, loadRunConfig } = require('sauce-testrunner-utils');
const { updateExportedValue } = require('sauce-testrunner-utils').saucectl;
const SauceLabs = require('saucelabs').default;
const { LOG_FILES } = require('./constants');
const fs = require('fs');
const fsExtra = require('fs-extra');
const glob = require('glob');

const { shouldRecordVideo, getAbsolutePath, toHyphenated, getArgs, exec } = utils;

const jobName = process.env.SAUCE_JOB_NAME || `DevX Playwright Test Run - ${(new Date()).getTime()}`;

// Path has to match the value of the Dockerfile label com.saucelabs.job-info !
const SAUCECTL_OUTPUT_FILE = '/tmp/output.json';

async function createJob (hasPassed, startTime, endTime, args, playwright, metrics, region, metadata) {
  const tld = region === 'staging' ? 'net' : 'com';
  const api = new SauceLabs({
    user: process.env.SAUCE_USERNAME,
    key: process.env.SAUCE_ACCESS_KEY,
    region,
    tld
  });
  const cwd = process.cwd();

  let sessionId;
  if (process.env.ENABLE_DATA_STORE) {
    // TODO: When we enable this make sure it's getting the proper parameters
    sessionId = await createJobReportV2(metadata, api);
  } else {
    sessionId = await createJobReport(metadata, api, hasPassed, startTime, endTime, args, playwright);
  }

  if (!sessionId) {
    throw new Error('Unable to retrieve test entry. Assets won\'t be uploaded.');
  }

  const containerLogFiles = LOG_FILES.filter(
    (path) => fs.existsSync(path));

  // Take the 1st webm video we find and translate it video.mp4
  // TODO: We need to translate all .webm to .mp4 and combine them into one video.mp4
  const webmFiles = glob.sync(path.join(cwd, '__assets__', '**', '*.webm'));
  let videoLocation;
  if (webmFiles.length > 0) {
    videoLocation = path.join(cwd, '__assets__', 'video.mp4');
    try {
      await exec(`ffmpeg -i ${webmFiles[0]} ${videoLocation}`, {suppressLogs: true});
    } catch (e) {
      videoLocation = null;
      console.error(`Failed to convert ${webmFiles[0]} to mp4: '${e}'`);
    }
  }

  let files = [
    path.join(cwd, 'console.log'),
    path.join(cwd, '__assets__', 'junit.xml'), // TOOD: Should add junit.xml.json as well
    ...containerLogFiles
  ];

  // Upload metrics
  for (let [, mt] of Object.entries(metrics)) {
    if (_.isEmpty(mt.data)) {
      continue;
    }
    let mtFile = path.join(cwd, '__assets__', mt.name);
    fs.writeFileSync(mtFile, JSON.stringify(mt.data, ' ', 2));
    files.push(mtFile);
  }

  if (videoLocation) {
    files.push(videoLocation);
  }

  await Promise.all([
    api.uploadJobAssets(sessionId, {files})
      .then(
        (resp) => {
          if (resp.errors) {
            for (let err of resp.errors) {
              console.error(err);
            }
          }
        },
        (e) => console.error('upload failed:', e.stack)
      ),
    api.updateJob(process.env.SAUCE_USERNAME, sessionId, {
      name: jobName,
      passed: hasPassed
    })
  ]);

  return sessionId;
}


async function runReporter ({ hasPassed, startTime, endTime, args, playwright, metrics, region, metadata }) {
  let jobDetailsUrl, reportingSucceeded = false;
  try {
    let sessionId = await createJob(hasPassed, startTime, endTime, args, playwright, metrics, region, metadata);
    let domain;
    const tld = region === 'staging' ? 'net' : 'com';
    switch (region) {
      case 'us-west-1':
        domain = 'saucelabs.com';
        break;
      default:
        domain = `${region}.saucelabs.${tld}`;
    }

    reportingSucceeded = true;
    jobDetailsUrl = `https://app.${domain}/tests/${sessionId}`;
    console.log(`\nOpen job details page: ${jobDetailsUrl}\n`);
  } catch (e) {
    console.log(`Failed to upload results to Sauce Labs. Reason: ${e.message}`);
  } finally {
    updateExportedValue(SAUCECTL_OUTPUT_FILE, { jobDetailsUrl, reportingSucceeded });
  }
}

async function run (nodeBin, runCfgPath, suiteName) {
  runCfgPath = getAbsolutePath(runCfgPath);
  const runCfg = await loadRunConfig(runCfgPath);
  runCfg.path = runCfgPath;
  const cwd = process.cwd();
  let defaultArgs = {
    param: {
      headful: process.env.SAUCE_VM ? true : false,
      video: shouldRecordVideo(),
    },
    reporter: 'junit,line',
  };
  let args = _.defaultsDeep(defaultArgs, {
    output: path.join(cwd, '__assets__'),
  });

  const suite = _.find(runCfg.suites, ({name}) => name === suiteName);
  if (!suite) {
    throw new Error(`Could not find suite named '${suiteName}'`);
  }
  let env = {
    ...process.env,
    ...suite.env,
    FOLIO_JUNIT_OUTPUT_NAME: path.join(cwd, '__assets__', 'junit.xml')
  };
  args = _.defaultsDeep(suite, args);

  const folioBin = path.join(__dirname, '..', 'node_modules', 'folio', 'cli');
  const procArgs = [folioBin];
  const excludeParams = ['name', 'platform-name', 'browser-name', 'playwright-version', 'env'];

  // Converts the JSON values to command line arguments
  // (CLI reference https://github.com/microsoft/playwright-test/blob/master/README.md#run-the-test)
  for (let [key, value] of Object.entries(args)) {
    key = toHyphenated(key);
    if (excludeParams.includes(key.toLowerCase())) {
      continue;
    }

    // The 'param' value is special. It works like this.
    // Input (yml)
    // =============
    //
    // param:
    //    browserName: "webkit"
    //    slowMo: 10000
    //
    // Output:
    // =============
    // folio ... --param browserName=webkit --param slowMo=10000
    if (key === 'param' || key === 'params') {
      for (let [paramName, paramValue] of Object.entries(value)) {
        procArgs.push(`--param`);
        procArgs.push(paramValue ? `${paramName}=${paramValue}` : paramName);
      }
    } else {
      procArgs.push(`--${key}`);
      procArgs.push(value);
    }
  }

  const projectPath = path.dirname(runCfg.path);
  if (!fs.existsSync(projectPath)) {
    throw new Error(`Could not find projectPath directory: '${projectPath}'`);
  }

  // Install NPM dependencies
  let metrics = [];
  let npmMetrics = await prepareNpmEnv(runCfg);
  metrics.push(npmMetrics);

  const folioProc = spawn(nodeBin, procArgs, {stdio: 'inherit', cwd: projectPath, env});

  const folioPromise = new Promise((resolve) => {
    folioProc.on('close', (code /*, ...args*/) => {
      const hasPassed = code === 0;
      resolve(hasPassed);
    });
  });

  let startTime, endTime, hasPassed = false;
  try {
    startTime = new Date().toISOString();
    hasPassed = await folioPromise;
    endTime = new Date().toISOString();
  } catch (e) {
    console.error(`Could not complete job. Reason: ${e}`);
  }

  // Move to __assets__
  const files = glob.sync(path.join(projectPath, 'test-results', '*')) || [];
  for (const file of files) {
    fsExtra.moveSync(file, path.join(cwd, '__assets__', path.basename(file)));
  }

  // If it's a VM, don't try to upload the assets
  if (process.env.SAUCE_VM) {
    return hasPassed;
  }

  if (!(process.env.SAUCE_USERNAME && process.env.SAUCE_ACCESS_KEY)) {
    console.log('Skipping asset uploads! Remember to setup your SAUCE_USERNAME/SAUCE_ACCESS_KEY');
    return hasPassed;
  }

  const region = runCfg.sauce.region || 'us-west-1';
  await runReporter({ hasPassed, startTime, endTime, args, playwright: runCfg.playwright, metrics, region, metadata: runCfg.sauce.metadata});
  return hasPassed;
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

module.exports = { run };
