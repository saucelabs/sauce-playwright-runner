const got = require('got');
const playwright = require('playwright');

const { DEFAULT_JEST_TIMEOUT, SUPPORTED_BROWSER, DESIRED_BROWSER, LAUNCH_ARGS } = require('./constants');
const { logHelper } = require('./utils');

const testTimeout = (parseInt(process.env.TEST_TIMEOUT, 10) || DEFAULT_JEST_TIMEOUT);
process.stdout.write(`Setting test timeout to ${testTimeout}sec\n\n`);
jest.setTimeout(testTimeout * 1000);

global.logs = [];

beforeAll(async function () {
  if (!playwright[DESIRED_BROWSER]) {
    throw new Error(`browser name "${DESIRED_BROWSER}" not supported, choose between ${SUPPORTED_BROWSER.join(', ')}`);
  }

  global.browser = await playwright[DESIRED_BROWSER].launch({
    headless: !process.env.DISPLAY,
    args: LAUNCH_ARGS[DESIRED_BROWSER],
    logger: {
      isEnabled: () => true,
      log: logHelper
    }
  });

  // Create a new incognito browser context.
  global.context = await global.browser.newContext();
  // Create a new page in a pristine context.
  global.page = await context.newPage();

  if (!process.env.CI) {
    const req = got('http://localhost:9223/json');
    const pages = await req.json().catch((err) => err);
    if (pages && pages.length && process.env.SAUCE_DEVTOOLS_PORT) {
      console.log(`Watch test: https://chrome-devtools-frontend.appspot.com/serve_file/@ec99b9f060de3f065f466ccd2b2bfbf17376b61e/devtools_app.html?ws=localhost:${process.env.SAUCE_DEVTOOLS_PORT}/devtools/page/${pages[0].id}&remoteFrontend=true`);
    }
  }
});

const monkeyPatchedTest = (origFn) => (testName, testFn) => {
  function patchedFn (...args) {
    global.logs.push({
      status: 'info',
      message: testName,
      screenshot: null
    });
    return testFn.call(this, ...args);
  }
  return origFn(testName, patchedFn);
};

global.it = monkeyPatchedTest(global.it);
global.test = monkeyPatchedTest(global.test);
