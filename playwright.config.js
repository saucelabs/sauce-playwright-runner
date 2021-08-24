const process = require('process');
const _ = require('lodash');

let custom = {};
try {
  // Import the user's config if it exists
  custom = require('./playwright.config.js');
} catch {
}

const defaults = {
  use: {
    headed: process.env.SAUCE_VM ? true : false,
    video: process.env.SAUCE_VM ? 'off' : 'on',
  },
  reporter: [
    ['line'],
    ['junit', { outputFile: 'junit.xml' }],
  ],
};

if ('HTTP_PROXY' in process.env && process.env.HTTP_PROXY !== '') {
  defaults.use.proxy = {
    server: process.env.HTTP_PROXY,
  };
}

module.exports = _.defaultsDeep(defaults, custom);
