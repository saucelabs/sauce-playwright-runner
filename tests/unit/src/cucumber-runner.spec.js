const { buildArgs, normalizeFormat } = require('../../../src/cucumber-runner');

describe('buildArgs', () => {
  const cucumberBin = '/usr/local/bin/cucumber';

  it('should build correct arguments with basic configuration', () => {
    const runCfg = {
      sauce: {
        metadata: {},
      },
      projectPath: '/project',
      assetsDir: '/project/assets',
      suite: {
        options: {
          paths: ['features/test.feature'],
        },
      },
    };

    const result = buildArgs(runCfg, cucumberBin);

    expect(result).toEqual([
      cucumberBin,
      '/project/features/test.feature',
      '--force-exit',
      '--require-module',
      'ts-node/register',
      '--format',
      '"@saucelabs/cucumber-reporter":"sauce-test-report.json"',
      '--format-options',
      '{"upload":false,"outputFile":"/project/assets/sauce-test-report.json"}',
    ]);
  });
});

describe('normalizeFormat', () => {
  const assetDir = '/project/assets';

  it('should normalize format with both quoted format type and path', () => {
    expect(normalizeFormat(`"html":"formatter/report.html"`, assetDir)).toBe(
      `"html":"/project/assets/formatter/report.html"`,
    );
  });

  it('should normalize format with only one pair of quote', () => {
    expect(normalizeFormat(`"html:formatter/report.html"`, assetDir)).toBe(
      `"html":"/project/assets/formatter/report.html"`,
    );
  });

  it('should normalize format with no quotes', () => {
    expect(normalizeFormat(`html:formatter/report.html`, assetDir)).toBe(
      `"html":"/project/assets/formatter/report.html"`,
    );
  });

  it('should normalize formats with absolute path', () => {
    expect(
      normalizeFormat(`"html":"file:///tmp/formatter/report.html"`, assetDir),
    ).toBe(`"html":"file:///tmp/formatter/report.html"`);
    expect(
      normalizeFormat(`"html:file:///tmp/formatter/report.html"`, assetDir),
    ).toBe(`"html":"file:///tmp/formatter/report.html"`);
    expect(
      normalizeFormat(`html:file:///tmp/formatter/report.html`, assetDir),
    ).toBe(`"html":"file:///tmp/formatter/report.html"`);
  });

  it('should return simple strings as-is', () => {
    expect(normalizeFormat(`"usage"`, assetDir)).toBe('"usage"');
    expect(normalizeFormat(`usage`, assetDir)).toBe('usage');
  });
});
