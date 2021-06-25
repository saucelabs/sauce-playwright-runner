const utils = require('../../../src/utils');

describe('utils', function () {
  describe('.logHelper', function () {
    let nowSpy;
    let fakeTime = 0;
    beforeEach(function () {
      global.logs = [];
      global._timeOfLastCommand = 0;
      nowSpy = jest.spyOn(Date, 'now');
      nowSpy.mockImplementation(() => fakeTime += 1000);
    });
    afterEach(function () {
      nowSpy.mockClear();
    });
    it('should add to global logs', function () {
      const logMessage = {
        params: 'some-param',
        id: 'foo',
        method: 'warn',
      };
      utils.logHelper(null, null, `SEND ► ${JSON.stringify(logMessage)}`);
      expect(global.logs).toMatchSnapshot();
    });
  });
  describe('.replaceLegacyKeys', function () {
    it('should correct vars', function () {
      const tests = [{
        input: {
          browserName: 'chromium',
        },
        output: {
          browser: 'chromium',
        }
      }, {
        input: {
          video: true,
        },
        output: {},
      }, {
        input: {
          headful: true,
        },
        output: {
          headed: true,
        }
      }];
      for (const tt of tests) {
        const output = utils.replaceLegacyKeys(tt.input);
        expect(output).toMatchObject(tt.output);
      }
    });
  });
});