const { test, expect } = require('@playwright/test');

test('sauce-connect is working', async ({ page }) => {
  await page.goto('http://127.0.0.1:8000/');
  expect(await page.innerText('title')).toBe('Simple Page');
});
