/**
 * Copyright Microsoft Corporation. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const { test, expect } = require('@playwright/test');
const prettySeconds = require('pretty-seconds');

test('is a basic test with the page @basic', async ({ page }) => {
  await page.goto('https://playwright.dev/');
  expect(prettySeconds(80)).toBe('1 minute and 20 seconds');
  expect(await page.innerText('.navbar__title')).toBe('Playwright');
});
