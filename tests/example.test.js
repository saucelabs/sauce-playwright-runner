describe('saucectl demo test', function () {
  test('should verify title of the page', async function () {
    await page.goto('https://www.saucedemo.com/');
    expect(await page.title()).toBe('Swag Labs');
  });
});
