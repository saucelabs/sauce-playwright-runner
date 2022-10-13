/** @type {import('jest').Config} */
const config = {
  testMatch: ['**/tests/unit/**/*.[jt]s?(x)'],
  collectCoverageFrom: ['src/**/*.js'],
  collectCoverage: true,
  transformIgnorePatterns: [
    '/node_modules/(?!(axios)/)' // Uses module import statements, which aren't supported by jest, so it has to be transformed by babel.
  ]
};

module.exports = config;
