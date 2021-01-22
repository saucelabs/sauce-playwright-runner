jest.mock('child_process');
jest.mock('saucelabs');
jest.mock('fs');
jest.mock('../../../src/reporter');
const path = require('path');
const { run } = require('../../../src/folio-runner');
const childProcess = require('child_process');
const { EventEmitter } = require('events');
const SauceLabs = require('saucelabs').default;
const fs = require('fs');
const utils = require('../../../src/utils');

describe('folio-runner', function () {
  const baseRunCfg = {
    playwright: {
      version: '1.4.1',
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
        testMatch: '**/*.spec.js'
      }
    ]
  };
  let backupLoadRunConfig;
  describe('.run', function () {
    let spawnMock, folioProc, backupEnv, fsExistsMock;
    beforeEach(function () {
      backupLoadRunConfig = utils.loadRunConfig;
      backupEnv = {};
      spawnMock = jest.spyOn(childProcess, 'spawn');
      fsExistsMock = jest.spyOn(fs, 'existsSync');
      folioProc = new EventEmitter();
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
          folioProc.emit('close', 0);
        }, 10);
        return folioProc;
      });
      fsExistsMock.mockImplementation((url) => url.startsWith('/bad/path') ? false : true);
      process.env = {
        SAUCE_TAGS: 'tag-one,tag-two',
        HELLO: 'world',
      };
    });
    afterEach(function () {
      process.env = backupEnv;
      utils.loadRunConfig = backupLoadRunConfig;
    });
    it('should run playwright test as a spawn command', async function () {
      utils.loadRunConfig = jest.fn(() => ({...baseRunCfg}));
      await run('/fake/path/to/node', '/fake/runner/path', 'basic-js');
      const [[nodeBin, procArgs, spawnArgs]] = spawnMock.mock.calls;
      procArgs[0] = path.basename(procArgs[0]);
      procArgs[procArgs.length - 1] = path.basename(procArgs[procArgs.length - 1]);
      spawnArgs.cwd = path.basename(spawnArgs.cwd);
      spawnArgs.env.FOLIO_JUNIT_OUTPUT_NAME = path.basename(spawnArgs.env.FOLIO_JUNIT_OUTPUT_NAME);
      expect([nodeBin, procArgs, spawnArgs]).toMatchSnapshot();
    });
  });
});