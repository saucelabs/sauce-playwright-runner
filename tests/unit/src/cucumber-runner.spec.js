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
          formatOptions: {
            myOption: 'test',
          },
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
      '"@saucelabs/cucumber-reporter":"cucumber.log"',
      '--format-options',
      '{"upload":false,"outputFile":"/project/assets/sauce-test-report.json","myOption":"test"}',
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

  it('should normalize format with file path type', () => {
    expect(
      normalizeFormat(
        `"file://formatter/implementation":"report.json"`,
        assetDir,
      ),
    ).toBe(`"file://formatter/implementation":"/project/assets/report.json"`);
  });

  it('should throw an error for an invalid file path type', () => {
    expect(() => {
      normalizeFormat(`file://formatter/implementation:report.json`, assetDir);
    }).toThrow('Ambiguous colon usage detected');
  });

  it('should return simple strings as-is', () => {
    expect(normalizeFormat(`"usage"`, assetDir)).toBe('"usage"');
    expect(normalizeFormat(`usage`, assetDir)).toBe('usage');
  });
});
