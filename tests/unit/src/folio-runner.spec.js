jest.mock('child_process');
jest.mock('saucelabs');
jest.mock('../../../src/reporter');
const path = require('path');
const { run } = require('../../../src/folio-runner');
const childProcess = require('child_process');
const { EventEmitter } = require('events');
const SauceLabs = require('saucelabs').default;

describe('folio-runner', function () {
  describe('.run', function () {
    let spawnMock, folioProc, backupEnv;
    beforeEach(function () {
      backupEnv = {};
      spawnMock = jest.spyOn(childProcess, 'spawn');
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
      process.env = {
        SAUCE_TAGS: 'tag-one,tag-two',
        HELLO: 'world',
      };
    });
    afterEach(function () {
      process.env = backupEnv;
    });
    it('should run playwright test as a spawn command', async function () {
      const sauceRunnerPath = path.join(__dirname, '..', '..', 'fixtures', 'basic-js', 'sauce-runner.json');
      await run('/fake/path/to/node', sauceRunnerPath, 'basic-js');
      const [[nodeBin, procArgs, spawnArgs]] = spawnMock.mock.calls;
      procArgs[0] = path.basename(procArgs[0]);
      procArgs[procArgs.length - 1] = path.basename(procArgs[procArgs.length - 1]);
      spawnArgs.cwd = path.basename(spawnArgs.cwd);
      spawnArgs.env.FOLIO_JUNIT_OUTPUT_NAME = path.basename(spawnArgs.env.FOLIO_JUNIT_OUTPUT_NAME);
      expect([nodeBin, procArgs, spawnArgs]).toMatchSnapshot();
    });
  });
});