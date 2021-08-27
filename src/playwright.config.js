const process = require('process');

const defaults = {
  use: {
    headed: process.env.SAUCE_VM ? true : false,
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

  defaults.use.contextOptions = { proxy, ignoreHTTPSErrors: true };
  // Need to set the browser launch option as well, it is a hard requirement when testing chromium + windows.
  defaults.use.launchOptions = { proxy, ignoreHTTPSErrors: true };
}

module.exports = defaults;
