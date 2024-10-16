/** @type {import('jest').Config} */
const config = {
  testMatch: ['**/tests/unit/**/*.[jt]s?(x)'],
  collectCoverageFrom: ['src/**/*.js'],
  collectCoverage: true,
  clearMocks: true,
  coverageProvider: 'v8',
  transform: { '^.+\\.ts?$': 'ts-jest' },
};

module.exports = config;
