import * as fs from 'node:fs';
import * as process from 'node:process';
import { pathToFileURL } from 'node:url';
import { buildConfig } from './sauce-config-shared.cjs';

let userConfig = {};

// Prefer ts over js to match default behaviour of playwright-test
const configFiles = process.env.PLAYWRIGHT_CFG_FILE
  ? [process.env.PLAYWRIGHT_CFG_FILE]
  : ['./playwright.config.ts', './playwright.config.js'];

for (const file of configFiles) {
  if (fs.existsSync(file)) {
    try {
      userConfig = await import(pathToFileURL(file).toString());
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

export default buildConfig(userConfig);
