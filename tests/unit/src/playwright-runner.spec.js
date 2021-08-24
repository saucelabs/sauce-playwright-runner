jest.mock('child_process');
jest.mock('saucelabs');
jest.mock('fs');
jest.mock('glob');
jest.mock('sauce-testrunner-utils');
jest.mock('../../../src/reporter');
const path = require('path');
const { run } = require('../../../src/playwright-runner');
const childProcess = require('child_process');
const { EventEmitter } = require('events');
const SauceLabs = require('saucelabs').default;
const fs = require('fs');
const glob = require('glob');
const testRunnerUtils = require('sauce-testrunner-utils');

describe('playwright-runner', function () {
  const baseRunCfg = {
    playwright: {
      version: '1.12.2',
      projectPath: 'path/to/project'
    },
    suites: [
      {
        name: 'basic-js',
        param: {
          browserName: 'chromium',
          headful: true,
          slowMo: 1000
        },
        testMatch: ['**/*.spec.js', '**/*.test.js']
      }
    ]
  };
  describe('.run', function () {
    let spawnMock, playwrightProc, backupEnv, fsExistsMock, cwdMock;
    beforeEach(function () {
      backupEnv = {};
      spawnMock = jest.spyOn(childProcess, 'spawn');
      fsExistsMock = jest.spyOn(fs, 'existsSync');
      cwdMock = jest.spyOn(process, 'cwd');
      playwrightProc = new EventEmitter();
      SauceLabs.mockImplementation(() => ({
        uploadJobAssets () {
          return {};
        },
        updateJob () {
          return {};
        },
      }));
      spawnMock.mockImplementation(() => {
        setTimeout(() => {
          playwrightProc.emit('close', 0);
        }, 10);
        return playwrightProc;
      });
      fsExistsMock.mockImplementation((url) => url.startsWith('/bad/path') ? false : true);
      cwdMock.mockReturnValue('/fake/runner');
      process.env = {
        SAUCE_TAGS: 'tag-one,tag-two',
        HELLO: 'world',
      };
    });
    afterEach(function () {
      process.env = backupEnv;
    });
    it('should run playwright test as a spawn command in VM', async function () {
      process.env.SAUCE_VM = 'truthy';
      testRunnerUtils.loadRunConfig.mockReturnValue({...baseRunCfg});
      await run('/fake/path/to/node', '/fake/runner/path', 'basic-js');
      glob.sync.mockReturnValueOnce([]);
      const [[nodeBin, procArgs, spawnArgs]] = spawnMock.mock.calls;
      procArgs[0] = path.basename(procArgs[0]);
      spawnArgs.cwd = path.basename(spawnArgs.cwd);
      expect(nodeBin).toMatch('/fake/path/to/node');
      expect(procArgs).toMatchObject([
        'cli.js',
        'test',
        '--output',
        '/fake/runner/__assets__',
        '--config',
        '/fake/runner/custom.config.js',
        '--browser',
        'chromium',
        '--headed',
        '**/*.spec.js',
        '**/*.test.js',
      ]);
      expect(spawnArgs).toMatchObject({
        'cwd': 'runner',
        'env': {
          'HELLO': 'world',
          'SAUCE_TAGS': 'tag-one,tag-two',
        },
        'stdio': 'inherit',
      });
    });
  });
});
