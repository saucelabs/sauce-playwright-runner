const fs = require('fs');
const path = require('path');

const logger = require('@wdio/logger').default;
const SauceLabs = require('saucelabs').default;

const { exec } = require('./utils');
const { LOG_FILES, HOME_DIR, DESIRED_BROWSER } = require('./constants');

const log = logger('reporter');

const region = process.env.SAUCE_REGION || 'us-west-1';
const tld = region === 'staging' ? 'net' : 'com';

const api = new SauceLabs({
  user: process.env.SAUCE_USERNAME,
  key: process.env.SAUCE_ACCESS_KEY,
  region,
  tld
});

// SAUCE_JOB_NAME is only available for saucectl >= 0.16, hence the fallback
const jobName = process.env.SAUCE_JOB_NAME || `DevX Playwright Test Run - ${(new Date()).getTime()}`;

let startTime, endTime;

// NOTE: this function is not available currently.
// It will be ready once data store API actually works.
// Keep these pieces of code for future integration.
const createJobReportV2 = async (metadata, api) => {
  const body = {
    name: jobName,
    acl: [
      {
        type: 'username',
        value: process.env.SAUCE_USERNAME
      }
    ],
    //'start_time: startTime,
    //'end_time: endTime,
    source: 'vdc', // will use devx
    platform: 'webdriver', // will use playwright
    status: 'complete',
    live: false,
    metadata: {},
    tags: metadata.tags, // TODO add 'build' information once API stabilizes
    attributes: {
      container: false,
      browser: DESIRED_BROWSER,
      browser_version: DESIRED_BROWSER.toLowerCase() === 'firefox' ? process.env.FF_VER : process.env.CHROME_VER,
      commands_not_successful: 1, // to be removed
      devx: true,
      os: 'test', // need collect
      performance_enabled: 'true', // to be removed
      public: 'team',
      record_logs: true, // to be removed
      record_mp4: 'true', // to be removed
      record_screenshots: 'true', // to be removed
      record_video: 'true', // to be removed
      video_url: 'test', // remove
      log_url: 'test' // remove
    }
  };

  let sessionId;
  await Promise.all([
    api.createResultJob(
      body
    ).then(
      (resp) => {
        sessionId = resp.id;
      },
      (e) => {
        console.error('Create job failed: ', e.stack);
      }
    )
  ]);

  return sessionId || 0;
};

// TODO Tian: this method is a temporary solution for creating jobs via test-composer.
// Once the global data store is ready, this method will be deprecated.
async function createJobReport (metadata, api, passed, startTime, endTime, args, playwright) {
  /**
     * don't try to create a job if no credentials are set
     */
  if (!process.env.SAUCE_USERNAME || !process.env.SAUCE_ACCESS_KEY) {
    return;
  }

  let browserVersion = DESIRED_BROWSER.toLowerCase() === 'firefox' ? process.env.FF_VER : process.env.CHROME_VER;
  if (!browserVersion) {
    browserVersion = playwright.version;
  }

  const body = {
    name: jobName,
    user: process.env.SAUCE_USERNAME,
    startTime,
    endTime,
    framework: 'playwright',
    frameworkVersion: process.env.PLAYWRIGHT_VERSION,
    status: 'complete',
    errors: [],
    passed,
    tags: metadata.tags,
    build: metadata.build,
    browserName: args.param.browserName,
    browserVersion,
    platformName: process.env.IMAGE_NAME + ':' + process.env.IMAGE_TAG,
  };

  let sessionId;
  await api.createJob(
        body
  ).then(
        (resp) => {
          sessionId = resp.ID;
        },
        (e) => {
          console.error('Create job failed: ', e.stack);
        }
  );

  return sessionId || 0;
}

module.exports = class TestrunnerReporter {
  async onRunStart () {
    startTime = new Date().toISOString();
    log.info('Start video capturing');
    await exec('start-video');
  }

  async onRunComplete (test, { testResults, numFailedTests }) {
    if (process.env.SAUCE_USERNAME === '' || process.env.SAUCE_ACCESS_KEY === '') {
      console.log('Skipping asset uploads! Remember to setup your SAUCE_USERNAME/SAUCE_ACCESS_KEY');
      return;
    }
    endTime = new Date().toISOString();
    log.info('Finished testrun!');

    let tags = process.env.SAUCE_TAGS;
    if (tags) {
      tags = tags.split(',');
    }

    let sessionId;
    const hasPassed = numFailedTests === 0;
    if (process.env.ENABLE_DATA_STORE) {
      sessionId = await createJobReportV2(tags, api);
    } else {
      sessionId = await createJobReport(tags, api, hasPassed, startTime, endTime);
    }

    /**
         * only upload assets if a session was initiated before
         */

    if (!sessionId) {
      return;
    }

    await exec('stop-video');

    const logFilePath = path.join(HOME_DIR, 'log.json');
    fs.writeFileSync(logFilePath, JSON.stringify(testResults, null, 4));

    const containterLogFiles = LOG_FILES.filter(
            (path) => fs.existsSync(path));

    await Promise.all([
      api.uploadJobAssets(
            sessionId,
            {
              files: [
                logFilePath,
                ...containterLogFiles
              ]
            }
      ).then(
            (resp) => {
              if (resp.errors) {
                for (let err of resp.errors) {
                  console.error(err);
                }
              }
            },
            (e) => log.error('upload failed:', e.stack)
      )
    ]);

    let domain;

    switch (region) {
      case 'us-west-1':
        domain = 'saucelabs.com';
        break;
      default:
        domain = `${region}.saucelabs.${tld}`;
    }
    console.log(`\nOpen job details page: https://app.${domain}/tests/${sessionId}\n`);
  }
};

module.exports.createJobReportV2 = createJobReportV2;
module.exports.createJobReport = createJobReport;
