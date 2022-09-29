const { Before, When, Then } = require('@cucumber/cucumber');
const { chromium, firefox, webkit} = require('playwright');

Before(async function () {
  const opts = {
    headless: false,
    recordVideo: {
      dir: 'assets'
    }
  };
  switch (process.env.BROWSER_NAME) {
    case 'firefox':
      this.browser = await firefox.launch(opts);
      break;
    case 'webkit':
      this.browser = await webkit.launch(opts);
      break;
    default:
      this.browser = await chromium.launch(opts);
  }
  const context = await this.browser.newContext();
  this.page = await context.newPage();
});

When('I open {string} with firefox', async function (string) {
  await this.page.goto(string);
  await new Promise((resolve) => setTimeout(resolve, 1000));
});

Then('Close firefox', async function () {
  await this.browser.close();
});

