/**
 * Prints the versions for the browsers that are included in the currently installed version of playwright as a json string.
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
