const fs = require('fs');
const path = require('path');

const logger = require('@wdio/logger').default;
const SauceLabs = require('saucelabs').default;
const { remote } = require('webdriverio');

const { exec } = require('./utils');
const { LOG_FILES, HOME_DIR } = require('./constants');

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
let build = process.env.SAUCE_BUILD_NAME;

/**
 * replace placeholders (e.g. $BUILD_ID) with environment values
 */
const buildMatches = (build || '').match(/\$[a-zA-Z0-9_-]+/g) || [];
for (const match of buildMatches) {
  const replacement = process.env[match.slice(1)];
  build = build.replace(match, replacement || '');
}

// NOTE: this function is not available currently.
// It will be ready once data store API actually works.
// Keep these pieces of code for future integration.
const createJobShell = async (tags, api) => {
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
    tags,
    attributes: {
      container: false,
      browser: 'chromium',
      browser_version: '*',
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
        },
    )
  ]);

  return sessionId || 0;
};

const createjobLegacy = async (tags, api) => {
  /**
     * don't try to create a job if no credentials are set
     */
  if (!process.env.SAUCE_USERNAME || !process.env.SAUCE_ACCESS_KEY) {
    return;
  }

  /**
     * create a job shell by trying to initialise a session with
     * invalid capabilities
     * ToDo(Christian): remove once own testrunner job API is available
     */
  await remote({
    user: process.env.SAUCE_USERNAME,
    key: process.env.SAUCE_ACCESS_KEY,
    region,
    connectionRetryCount: 0,
    logLevel: 'silent',
    capabilities: {
      browserName: 'chrome',
      platformName: '*',
      browserVersion: '*',
      'sauce:options': {
        devX: true,
        name: jobName,
        tags,
        build
      }
    }
  }).catch((/*err*/) => {
    // Do nothing. Proceed in spite of error.
  });

  const { jobs } = await api.listJobs(
        process.env.SAUCE_USERNAME,
        { limit: 1, full: true, name: jobName }
  );
  return jobs && jobs.length && jobs[0].id;
};

module.exports = class TestrunnerReporter {
  constructor () {
    let tags = process.env.SAUCE_TAGS;
    if (tags) {
      tags = tags.split(',');
    }

    log.info('Create job shell');
    if (process.env.ENABLE_DATA_STORE) {
      this.sessionId = createJobShell(tags, api);
    } else {
      this.sessionId = createjobLegacy(tags, api, region, tld);
    }
  }

  async onRunStart () {
    log.info('Start video capturing');
    await exec('start-video');
  }

  async onRunComplete (test, { testResults, numFailedTests }) {
    log.info('Finished testrun!');

    const hasPassed = numFailedTests === 0;
    const sessionId = await this.sessionId;

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
      ),
      api.updateJob(process.env.SAUCE_USERNAME, sessionId, {
        name: jobName,
        passed: hasPassed
      })
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

module.exports.createjobLegacy = createjobLegacy;
module.exports.createJobShell = createJobShell;
