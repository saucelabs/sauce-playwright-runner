// Shared config-building logic consumed by both sauce.config.cjs and sauce.config.mjs.
//
// This is a CJS module so that both CJS and ESM entrypoints can import it.
// Caveat: importing CJS from ESM loses tree-shaking, but that's irrelevant here
// since these are small config files running in Node.js, not bundled for browsers.

const _ = require('lodash');

function arrMerger(objValue, srcValue) {
  if (_.isArray(objValue)) {
    return objValue.concat(srcValue);
  }
}

/**
 * Builds the final Playwright config by merging the user's config with
 * Sauce-specific overrides (browser settings, proxy, reporters, etc.).
 *
 * @param {object} userConfig - The user's playwright.config.js/ts content
 * @returns {object} The merged config ready for Playwright
 */
function buildConfig(userConfig) {
  const overrides = {
    use: {
      headless: process.env.HEADLESS === 'true',
      video: 'off',
      launchOptions: {},
      contextOptions: {},
    },
    reporter: [
      ['list'],
      // outputFile is set by playwright-runner.js as an env variable. The runner needs to process it
      // so better for it to set the output path
      ['junit'],
      // outputFile is set by playwright-runner.js as an env variable. The runner needs to process it
      // so better for it to set the output path
      [
        '@saucelabs/playwright-reporter',
        {
          upload: false,
        },
      ],
    ],
    testIgnore: process.env.TEST_IGNORE?.split(','),
  };

  // Values that are arrays are merged at the very end (see arrMerger()), but primitives are not.
  // Allow the user to set a single reporter like so: `reporter: 'list'`.
  if (userConfig.reporter && !(userConfig.reporter instanceof Array)) {
    overrides.reporter.push([userConfig.reporter]);
  }

  if (process.env.BROWSER_NAME !== 'chrome') {
    // chromium, firefox and webkit come pre-packaged with playwright.
    // So we can just pass those browser values to playwright and
    // it knows what to do and where to pick them up.
    overrides.use.browserName = process.env.BROWSER_NAME; // override browserName with suite browserName
  } else {
    // Google chrome is provided by the sauce VM. So we have to let playwright know where to look.
    overrides.use.channel = 'chrome';
    overrides.use.launchOptions.executablePath = process.env.BROWSER_PATH;
  }

  if ('HTTP_PROXY' in process.env && process.env.HTTP_PROXY !== '') {
    const proxy = {
      server: process.env.HTTP_PROXY,
    };

    overrides.use.contextOptions = {
      ...overrides.use.contextOptions,
      proxy,
      ignoreHTTPSErrors: true,
    };
    // Need to set the browser launch option as well, it is a hard requirement when testing chromium + windows.
    overrides.use.launchOptions = {
      ...overrides.use.launchOptions,
      proxy,
      ignoreHTTPSErrors: true,
    };

    // Merge proxy settings into each project's contextOptions as well.
    // Playwright resolves project config by merging project-level `use` over
    // root-level `use`. If a project defines its own `use.contextOptions`
    // (e.g. { reducedMotion: 'reduce' }), it completely replaces the
    // root-level contextOptions — which would lose the SC tunnel proxy
    // settings and cause requests to fail with ENOTFOUND.
    // By merging proxy settings directly into each project's contextOptions,
    // both the user's project-level options and the proxy coexist.
    if (Array.isArray(userConfig.projects)) {
      for (const project of userConfig.projects) {
        if (project.use?.contextOptions) {
          project.use.contextOptions = {
            ...project.use.contextOptions,
            proxy,
            ignoreHTTPSErrors: true,
          };
        }
      }
    }
  }

  return _.mergeWith(userConfig, overrides, arrMerger);
}

module.exports = { buildConfig };
