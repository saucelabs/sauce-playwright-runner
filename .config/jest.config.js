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
    ],
    testMatch: [
        '/home/seluser/tests/**/*.[jt]s?(x)',
        '/home/seluser/tests/**/?(*.)+(spec|test).[jt]s?(x)'
    ]
};
