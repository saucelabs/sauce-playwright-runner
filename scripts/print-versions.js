/**
 * Prints the versions for the browsers that are included in the currently installed version of playwright
 *
 * Used by scripts/update-playwright-browsers.sh when a release is triggered by the release-it tool
 * as an `after:bump` hook
 */
const playwright = require('playwright');

async function browserVersion (browserType) {
  const browser = await browserType.launch();
  const result = browser.version();
  await browser.close();
  return result;
}

(async () => {
  const chromiumVersion = await browserVersion(playwright.chromium);
  const firefoxVersion = await browserVersion(playwright.firefox);
  const webkitVersion = await browserVersion(playwright.webkit);

  console.log(JSON.stringify({
    chromium: chromiumVersion,
    firefox: firefoxVersion,
    webkit: webkitVersion,
  }, null, 4));
})();
