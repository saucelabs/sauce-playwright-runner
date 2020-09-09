const path = require('path')
const fs = require('fs');
const yaml = require('js-yaml');
const {promisify} = require('util');
const {HOME_DIR} = require('../src/constants')

// Promisify callback functions
const fileExists = promisify(fs.exists)
const readFile = promisify(fs.readFile)

// the default test matching behavior for versions <= v0.1.5
const DefaultRunCfg = {
    projectPath: `${HOME_DIR}`,
    match: [
        `${HOME_DIR}/tests/?(*.)+(spec|test).[jt]s?(x)`,
        `${HOME_DIR}/tests/**/?(*.)+(spec|test).[jt]s?(x)`
    ]
}

async function loadRunConfig(cfgPath) {
    if (await fileExists(cfgPath)) {
        return yaml.safeLoad(await readFile(cfgPath, 'utf8'));
    }
    console.log(`Run config (${cfgPath}) unavailable. Loading defaults.`)

    return DefaultRunCfg
}

function resolveTestMatches(runCfg) {
    return runCfg.match.map(
        p => {
            if (path.isAbsolute(p)) {
                return p
            }
            return path.join(runCfg.projectPath, p)
        }
    );
}

module.exports = async () => {
    const runCfgPath = path.join(HOME_DIR, 'run.yaml')
    const runCfg = await loadRunConfig(runCfgPath)
    const testMatch = resolveTestMatches(runCfg)

    return {
        rootDir: HOME_DIR,
        testEnvironment: 'node',
        testRunner: 'jest-circus/runner',
        setupFilesAfterEnv: [
            `${HOME_DIR}/src/jest.setup.js`,
            `${HOME_DIR}/src/jest.teardown.js`
        ],
        reporters: [
            `default`,
            `${HOME_DIR}/src/reporter.js`
        ],
        testMatch: testMatch,
    };
};
