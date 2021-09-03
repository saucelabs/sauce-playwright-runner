const process = require('process');
const { accessSync, constants } = require('fs');
const _ = require('lodash');

let userConfig = {};
if (accessSync('./playwright.config.js', constants.F_OK)) {
  userConfig = require('./playwright.config.js');
} else if (accessSync('./playwright.config.ts', constants.F_OK)) {
  userConfig = require('./playwright.config.ts');
}


const overrides = {
  use: {
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
