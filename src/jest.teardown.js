afterAll(async function () {
  if (global.browser) {
    await global.browser.close().catch(
            (err) => console.error(`Failed to close browser: ${err.message}`));
  }
});
