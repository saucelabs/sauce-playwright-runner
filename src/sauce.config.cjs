const fs = require('fs');
const { buildConfig } = require('./sauce-config-shared.cjs');

let userConfig = {};

// Prefer ts over js to match default behaviour of playwright-test
const configFiles = process.env.PLAYWRIGHT_CFG_FILE
  ? [process.env.PLAYWRIGHT_CFG_FILE]
  : ['./playwright.config.ts', './playwright.config.js'];

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

module.exports = buildConfig(userConfig);
