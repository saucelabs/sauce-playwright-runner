const {DESIRED_BROWSER} = require('./constants');

async function createJobReport(runCfg, testComposer, passed, startTime, endTime) {
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

  let job;
  try {
    job = await testComposer.createReport({
      name: runCfg.suite.name,
      startTime,
      endTime,
      framework: 'playwright',
      frameworkVersion: process.env.PLAYWRIGHT_VERSION,
      passed,
      tags: runCfg.sauce.metadata?.tags,
      build: runCfg.sauce.metadata?.build,
      browserName,
      browserVersion,
      platformName: process.env.IMAGE_NAME + ':' + process.env.IMAGE_TAG
    });
  } catch (e) {
    console.error('Failed to create job:', e);
  }

  return job;
}

module.exports.createJobReport = createJobReport;
