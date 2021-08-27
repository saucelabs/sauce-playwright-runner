/** @type {import('@playwright/test').PlaywrightTestConfig} */
module.exports = {
  use: {
    'headed': false,
    'video': false,
    'timezoneId': 'Asia/Seoul',
    reporter: [['dot']],
  },
};
