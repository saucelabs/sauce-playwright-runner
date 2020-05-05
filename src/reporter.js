const fs = require('fs')
const path = require('path')

const findProcess = require('find-process')
const logger = require('@wdio/logger').default
const SauceLabs = require('saucelabs').default
const { remote } = require('webdriverio')

const { exec } = require('./utils')
const { LOG_FILES, HOME_DIR } = require('./constants')

const log = logger('reporter')

const api = new SauceLabs({
    user: process.env.SAUCE_USERNAME,
    key: process.env.SAUCE_ACCESS_KEY,
    region: 'us-west-1'
})

const skipSauce = !process.env.SAUCE_USERNAME || !process.env.SAUCE_ACCESS_KEY;

module.exports = class TestrunnerReporter {
    constructor () {
        if (skipSauce) {
            console.warn("Skipping Sauce Labs integration. Please provide your Sauce Labs username & access key. https://github.com/saucelabs/saucectl#getting-started");
            return
        }
        log.info('Create job shell')
        this.sessionId = (async () => {
            const jobName = `DevX ${Math.random()}`
            const session = await remote({
                user: process.env.SAUCE_USERNAME,
                key: process.env.SAUCE_ACCESS_KEY,
                logLevel: 'silent',
                capabilities: {
                    browserName: 'chrome',
                    platformName: 'Windows 7',
                    browserVersion: 'latest',
                    // platformName: '*',
                    // browserVersion: '*',
                    'sauce:options': {
                        devX: true,
                        name: jobName
                    }
                }
            }).catch((err) => err)

            // const { jobs } = await api.listJobs(
            //     process.env.SAUCE_USERNAME,
            //     { limit: 1, full: true, name: jobName }
            // )
            await session.deleteSession()
            return session.sessionId // jobs[0].id
        })()
    }

    async onRunStart () {
        log.info('Start video capturing')
        await exec('start-video')
    }

    async onRunComplete (test, { testResults, numFailedTests }) {
        const filename = path.basename(testResults[0].testFilePath)
        const hasPassed = numFailedTests === 0

        const sessionId = await this.sessionId

        /**
         * wait a bit to ensure we don't upload before the job has finished
         */
        await new Promise((resolve) => setTimeout(resolve, 1000))

        log.info('Stop video capturing')
        await exec('stop-video')

        const logFilePath = path.join(process.cwd(), '/log.json')
        const containterLogFiles = LOG_FILES.filter(
            (path) => fs.existsSync(path))

        log.info('Finished testrun!')
        if (skipSauce) {
            return;
        }
        log.info("Updating job details to Sauce Labs")
        await Promise.all([
            api.uploadJobAssets(
                sessionId,
                [
                    logFilePath,
                    ...containterLogFiles
                ]
            ).then(
                () => log.info('upload successful'),
                (e) => log.error('upload failed:', e.stack)
            ),
            api.updateJob(process.env.SAUCE_USERNAME, sessionId, {
                name: filename,
                passed: hasPassed
            })
        ])
        log.info(`\nOpen job details page: https://app.saucelabs.com/tests/${sessionId}\n`)
    }
}
