const utils = require('../../../src/utils');

describe('utils', function () {
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
