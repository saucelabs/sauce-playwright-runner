const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

jest.mock('sauce-testrunner-utils', () => ({
  ...jest.requireActual('sauce-testrunner-utils'),
  zip: jest.fn(),
}));

const { zip } = require('sauce-testrunner-utils');
const { zipArtifacts } = require('../../../src/playwright-runner');

describe('zipArtifacts', () => {
  let projectPath;
  let assetsDir;

  beforeEach(() => {
    jest.clearAllMocks();
    projectPath = fs.realpathSync(
      fs.mkdtempSync(path.join(os.tmpdir(), 'pw-runner-test-')),
    );
    assetsDir = path.join(projectPath, '__assets__');
  });

  afterEach(() => {
    fs.rmSync(projectPath, { recursive: true, force: true });
  });

  it('zips retained directories into the assets dir', () => {
    const runCfg = {
      path: path.join(projectPath, 'sauce-runner.json'),
      assetsDir,
      artifacts: {
        retain: {
          'test-results': 'test-results.zip',
        },
      },
    };

    zipArtifacts(runCfg);

    expect(zip).toHaveBeenCalledWith(
      projectPath,
      'test-results',
      path.join(assetsDir, 'test-results.zip'),
    );
  });

  it('runs zip from the project dir and restores the cwd afterwards', () => {
    let cwdDuringZip;
    zip.mockImplementation(() => {
      cwdDuringZip = process.cwd();
    });
    const origCwd = process.cwd();
    const runCfg = {
      path: path.join(projectPath, 'sauce-runner.json'),
      assetsDir,
      artifacts: {
        retain: {
          'test-results': 'test-results.zip',
        },
      },
    };

    zipArtifacts(runCfg);

    expect(fs.realpathSync(cwdDuringZip)).toEqual(projectPath);
    expect(process.cwd()).toEqual(origCwd);
  });

  it('restores the cwd even when zip fails', () => {
    zip.mockImplementation(() => {
      throw new Error('boom');
    });
    const origCwd = process.cwd();
    const runCfg = {
      path: path.join(projectPath, 'sauce-runner.json'),
      assetsDir,
      artifacts: {
        retain: {
          'test-results': 'test-results.zip',
        },
      },
    };

    expect(() => zipArtifacts(runCfg)).not.toThrow();
    expect(process.cwd()).toEqual(origCwd);
  });

  it('does nothing when retain is not configured', () => {
    const runCfg = {
      path: path.join(projectPath, 'sauce-runner.json'),
      assetsDir,
      artifacts: {},
    };

    zipArtifacts(runCfg);

    expect(zip).not.toHaveBeenCalled();
  });
});
