const process = require('process');
const _ = require('lodash');

let userConfig = {};

// Prefer ts over js to match default behaviour of playwright-test
const defaultConfigFiles = ['./playwright.config.ts', './playwright.config.js'];
for (const file of defaultConfigFiles) {
  try {
    userConfig = require(file);
    break;
  } catch {}
}

const overrides = {
  use: {
    browserName: process.env.browserName,
    headless: process.env.SAUCE_VM ? false : true,
    video: process.env.SAUCE_VM ? 'off' : 'on',
  },
  reporter: [
    ['list'],
    // outputFile is set by playwright-runner.js as an env variable. The runner needs to process it
    // so better for it to set the output path
    ['junit'],
  ],
};

if ('HTTP_PROXY' in process.env && process.env.HTTP_PROXY !== '') {
  const proxy = {
    server: process.env.HTTP_PROXY,
  };

  overrides.use.contextOptions = { proxy, ignoreHTTPSErrors: true };
  // Need to set the browser launch option as well, it is a hard requirement when testing chromium + windows.
  overrides.use.launchOptions = { proxy, ignoreHTTPSErrors: true };
}

module.exports = _.merge(userConfig, overrides);
