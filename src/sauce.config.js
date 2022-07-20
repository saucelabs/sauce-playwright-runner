const process = require('process');
const _ = require('lodash');
const fs = require('fs');

let userConfig = {};

// Prefer ts over js to match default behaviour of playwright-test
const configFiles = process.env.PLAYWRIGHT_CFG_FILE ?
  [process.env.PLAYWRIGHT_CFG_FILE] :
  ['./playwright.config.ts', './playwright.config.js'];

for (const file of configFiles) {
  if (fs.existsSync(file)) {
    try {
      userConfig = require(file);
      // it should put config just under root level to get it work with playwright.config.ts
      // there is no such issue with playwright.config.js
      if (userConfig.default) {
        userConfig = userConfig.default;
      }
      break;
    } catch (e) {
      console.error(e);
    }
  }
}

const overrides = {
  use: {
    browserName: process.env.BROWSER_NAME, // override browserName with suite browserName
    headless: process.env.SAUCE_VM ? process.env.HEADLESS === 'true' : true,
    video: process.env.SAUCE_VM ? 'off' : 'on',
  },
  reporter: [
    ['list'],
    // outputFile is set by playwright-runner.js as an env variable. The runner needs to process it
    // so better for it to set the output path
    ['junit'],
    // outputFile is set by playwright-runner.js as an env variable. The runner needs to process it
    // so better for it to set the output path
    ['@saucelabs/playwright-reporter',
      {
        upload: false,
      },
    ],
  ],
  testIgnore: process.env.TEST_IGNORE,
};

if ('HTTP_PROXY' in process.env && process.env.HTTP_PROXY !== '') {
  const proxy = {
    server: process.env.HTTP_PROXY,
  };

  overrides.use.contextOptions = { proxy, ignoreHTTPSErrors: true };
  // Need to set the browser launch option as well, it is a hard requirement when testing chromium + windows.
  overrides.use.launchOptions = { proxy, ignoreHTTPSErrors: true };
}

function arrMerger (objValue, srcValue) {
  if (_.isArray(objValue)) {
    return objValue.concat(srcValue);
  }
}

module.exports = _.mergeWith(userConfig, overrides, arrMerger);
