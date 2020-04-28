const path = require('path')

const ROOT = path.resolve(__dirname, '..')

module.exports = {
    rootDir: ROOT,
    testEnvironment: 'node',
    testRunner: 'jest-circus/runner',
    setupFilesAfterEnv: [
        `${ROOT}/src/jest.setup.js`,
        `${ROOT}/src/jest.teardown.js`
    ],
    reporters: [
        `default`,
        `${ROOT}/src/reporter.js`
    ]
};
