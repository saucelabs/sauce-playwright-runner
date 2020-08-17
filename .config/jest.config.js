const path = require('path')

const { HOME_DIR } = require('../src/constants')

module.exports = {
    rootDir: HOME_DIR,
    testEnvironment: 'node',
    testRunner: 'jest-circus/runner',
    setupFilesAfterEnv: [
        path.join(HOME_DIR, 'src', 'jest.setup.js'),
        path.join(HOME_DIR, 'src', 'jest.teardown.js'),
    ],
    reporters: [
        `default`,
        path.join(HOME_DIR, 'src', 'reporter.js'),
    ],
    testMatch: [
        path.join(HOME_DIR, 'tests', '?(*.)+(spec|test).js?(x)'),
        path.join(HOME_DIR, 'tests', '**', '?(*.)+(spec|test).js?(x)'),
    ]
};
