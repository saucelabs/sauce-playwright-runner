jest.mock('fs');
const {generateJunitfile} = require('../../../src/playwright-runner');
const fs = require('fs');

describe('playwright-runner', function () {
  it('should generate generateJunit', function () {
    const junitPath = 'tests/unit/src/__assets__/junit.xml';
    const backupContent = fs.readFileSync(junitPath, 'utf8');

    generateJunitfile('tests/unit/src/', 'Firefox using global mode', 'firefox');

    expect(fs.readFileSync(junitPath)).toEqual(fs.readFileSync('tests/unit/src/__assets__/expected_junit.xml'));

    fs.writeFileSync(junitPath, backupContent);
  });
});
