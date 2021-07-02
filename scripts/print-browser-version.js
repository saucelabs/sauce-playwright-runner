/**
 * Takes a browser name (one of 'chromium', 'firefox', or 'webkit')and prints the version
 * to stdout
 */
const playwright = require('playwright');
const process = require('process');

async function browserVersion (browserType) {
  if (!browserType) {
    return '';
  }
  const browser = await browserType.launch();
  const result = browser.version();
  await browser.close();
  return result;
}

(async () => {
  const args = process.argv.slice(2);

  // browser is one of 'chromium, firefox, webkit'
  const browser = args[0];
  const version = await browserVersion(playwright[browser]);
  console.log(version);
})();
