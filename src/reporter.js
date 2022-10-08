const { DESIRED_BROWSER } = require('./constants');

async function createJobReport (runCfg, api, passed, startTime, endTime, saucectlVersion) {
  /**
     * don't try to create a job if no credentials are set
     */
  if (!process.env.SAUCE_USERNAME || !process.env.SAUCE_ACCESS_KEY) {
    return;
  }
  const browserName = runCfg.Kind === 'playwright' ? runCfg.args.param.browser : runCfg.suite.browserName;
  let browserVersion = DESIRED_BROWSER.toLowerCase() === 'firefox' ? process.env.FF_VER : process.env.CHROME_VER;
  if (!browserVersion) {
    browserVersion = runCfg.playwright.version;
  }

  const body = {
    name: runCfg.suite.name,
    user: process.env.SAUCE_USERNAME,
    startTime,
    endTime,
    framework: 'playwright',
    frameworkVersion: process.env.PLAYWRIGHT_VERSION,
    status: 'complete',
    suite: runCfg.suite.name,
    errors: [],
    passed,
    tags: runCfg.sauce.metadata?.tags,
    build: runCfg.sauce.metadata?.build,
    browserName,
    browserVersion,
    platformName: process.env.IMAGE_NAME + ':' + process.env.IMAGE_TAG,
    saucectlVersion,
  };

  let resp;
  try {
    resp = await api.createJob(body);
  } catch (e) {
    console.error('Create job failed: ', e.stack);
  }

  return resp?.ID || 0;
}

module.exports.createJobReport = createJobReport;
