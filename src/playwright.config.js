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
  defaults.use.contextOptions = {
    proxy: {
      server: process.env.HTTP_PROXY,
    },
  };
}

module.exports = defaults;
