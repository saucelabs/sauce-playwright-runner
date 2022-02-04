jest.mock('child_process');
jest.mock('saucelabs');
jest.mock('fs');
jest.mock('glob');
jest.mock('sauce-testrunner-utils');
jest.mock('../../../src/reporter');
const path = require('path');
const { run, generateJunitfile } = require('../../../src/playwright-runner');
const childProcess = require('child_process');
const { EventEmitter } = require('events');
const SauceLabs = require('saucelabs').default;
const fs = require('fs');
const glob = require('glob');
const testRunnerUtils = require('sauce-testrunner-utils');

const MOCK_CWD = '/fake/runner';

describe('playwright-runner', function () {
  const baseRunCfg = {
    playwright: {
      version: '1.12.2',
      projectPath: 'path/to/project',
      configFile: 'path/to/config',
    },
    suites: [
      {
        name: 'basic-js',
        param: {
          browserName: 'chromium',
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
      cwdMock.mockReturnValue(MOCK_CWD);
      process.env = {
        SAUCE_TAGS: 'tag-one,tag-two',
        HELLO: 'world',
      };
    });

    afterEach(function () {
      process.env = backupEnv;
      baseRunCfg.suites[0].param.headless = false;
    });

    it('should run playwright test as a spawn command in VM', async function () {
      process.env.SAUCE_VM = 'truthy';
      testRunnerUtils.loadRunConfig.mockReturnValue({...baseRunCfg});
      await run('/fake/path/to/node', path.join(MOCK_CWD, 'sauce-runner.json'), 'basic-js');
      glob.sync.mockReturnValueOnce([]);
      const [[nodeBin, procArgs, spawnArgs]] = spawnMock.mock.calls;
      procArgs[0] = path.basename(procArgs[0]);
      spawnArgs.cwd = path.basename(spawnArgs.cwd);
      expect(nodeBin).toMatch('/fake/path/to/node');
      expect(procArgs).toMatchObject([
        'cli.js',
        'test',
        '--output',
        path.join(MOCK_CWD, '__assets__'),
        '--config',
        path.join(MOCK_CWD, 'sauce.config.js'),
        '--timeout',
        1800000,
        '--browser',
        'chromium',
        '**/*.spec.js',
        '**/*.test.js',
      ]);
      expect(spawnArgs).toMatchObject({
        'cwd': 'runner',
        'env': {
          'HELLO': 'world',
          'SAUCE_TAGS': 'tag-one,tag-two',
          'PLAYWRIGHT_JUNIT_OUTPUT_NAME': path.join(MOCK_CWD, '__assets__', 'junit.xml'),
        },
        'stdio': 'inherit',
      });
    });

    it('should run playwright headless test', async function () {
      process.env.SAUCE_VM = 'truthy';
      baseRunCfg.suites[0].param.headless = true;
      testRunnerUtils.loadRunConfig.mockReturnValue({...baseRunCfg});
      await run('/fake/path/to/node', path.join(MOCK_CWD, 'sauce-runner.json'), 'basic-js');
      glob.sync.mockReturnValueOnce([]);
      const [[nodeBin, procArgs, spawnArgs]] = spawnMock.mock.calls;
      procArgs[0] = path.basename(procArgs[0]);
      spawnArgs.cwd = path.basename(spawnArgs.cwd);
      expect(nodeBin).toMatch('/fake/path/to/node');
      expect(procArgs).toMatchObject([
        'cli.js',
        'test',
        '--output',
        path.join(MOCK_CWD, '__assets__'),
        '--config',
        path.join(MOCK_CWD, 'sauce.config.js'),
        '--timeout',
        1800000,
        '--browser',
        'chromium',
        '**/*.spec.js',
        '**/*.test.js',
      ]);
      expect(spawnArgs).toMatchObject({
        'cwd': 'runner',
        'env': {
          'HELLO': 'world',
          'SAUCE_TAGS': 'tag-one,tag-two',
          'PLAYWRIGHT_JUNIT_OUTPUT_NAME': path.join(MOCK_CWD, '__assets__', 'junit.xml'),
        },
        'stdio': 'inherit',
      });
    });
  });

  describe('.generateJunit', function () {
    const junitPath = 'tests/unit/src/__assets__/junit.xml';
    const backupContent = fs.readFileSync(junitPath, 'utf8');

    generateJunitfile('tests/unit/src/', 'Firefox using global mode', 'firefox');

    expect(fs.readFileSync(junitPath)).toEqual(fs.readFileSync('tests/unit/src/__assets__/expected_junit.xml'));

    fs.writeFileSync(junitPath, backupContent);
  });
});
