/** @type {import('@playwright/test').PlaywrightTestConfig} */
module.exports = {
  use: {
    headless: true,
    video: 'off',
    timezoneId: 'Asia/Seoul',
    locale: 'ko-KR',
    reporter: [['dot']],
  },
};
