const path = require('path');

const HOME_DIR = '/home/seluser';
const LOG_DIR = '/var/log/cont';
exports.LOG_FILES = [
  path.join(LOG_DIR, 'chrome_browser.log'),
  path.join(LOG_DIR, '/firefox_browser.log'),
  path.join(LOG_DIR, '/supervisord.log'),
  path.join(LOG_DIR, '/video-rec-stderr.log'),
  path.join(LOG_DIR, '/video-rec-stdout.log'),
  path.join(LOG_DIR, '/wait-xvfb.1.log'),
  path.join(LOG_DIR, '/wait-xvfb.2.log'),
  path.join(LOG_DIR, '/wait-xvfb-stdout.log'),
  path.join(LOG_DIR, '/xvfb-tryouts-stderr.log'),
  path.join(LOG_DIR, '/xvfb-tryouts-stdout.log'),
  path.join(HOME_DIR, '/videos/video.mp4'),
  path.join(HOME_DIR, '/docker.log'),
  path.join(HOME_DIR, '/console.log'),
];

exports.DESIRED_BROWSER = process.env.BROWSER_NAME || 'chromium';

exports.CUCUMBER_FRAMEWORK = 'cucumber';
