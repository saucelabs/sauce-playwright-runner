const { DESIRED_BROWSER } = require('./constants');

// NOTE: this function is not available currently.
// It will be ready once data store API actually works.
// Keep these pieces of code for future integration.
const createJobReportV2 = async (suiteName, metadata, api) => {
  const body = {
    name: suiteName,
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
async function createJobReport (suiteName, metadata, api, passed, startTime, endTime, args, playwright, saucectlVersion) {
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
    name: suiteName,
    user: process.env.SAUCE_USERNAME,
    startTime,
    endTime,
    framework: 'playwright',
    frameworkVersion: process.env.PLAYWRIGHT_VERSION,
    status: 'complete',
    suite: suiteName,
    errors: [],
    passed,
    tags: metadata.tags,
    build: metadata.build,
    browserName: args.param.browserName,
    browserVersion,
    platformName: process.env.IMAGE_NAME + ':' + process.env.IMAGE_TAG,
    saucectlVersion,
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

module.exports.createJobReportV2 = createJobReportV2;
module.exports.createJobReport = createJobReport;
