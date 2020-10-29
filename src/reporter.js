const fs = require('fs')
const path = require('path')

const findProcess = require('find-process')
const logger = require('@wdio/logger').default
const SauceLabs = require('saucelabs').default
const { remote } = require('webdriverio')

const { exec } = require('./utils')
const { LOG_FILES, HOME_DIR } = require('./constants')

const log = logger('reporter')

const region = process.env.SAUCE_REGION || 'us-west-1'

const api = new SauceLabs({
    user: process.env.SAUCE_USERNAME,
    key: process.env.SAUCE_ACCESS_KEY,
    region: region
})

const jobName = `DevX ${Math.random()}`
let build = process.env.SAUCE_BUILD_NAME

/**
 * replace placeholders (e.g. $BUILD_ID) with environment values
 */
const buildMatches = (build || '').match(/\$[a-zA-Z0-9_-]+/g) || []
for (const match of buildMatches) {
    const replacement = process.env[match.slice(1)]
    build = build.replace(match, replacement || '')
}

module.exports = class TestrunnerReporter {
    constructor () {
        log.info('Create job shell')
        this.sessionId = (async () => {
            /**
             * don't try to create a job if no credentials are set
             */
            if (!process.env.SAUCE_USERNAME || !process.env.SAUCE_ACCESS_KEY) {
                return
            }

            let tags = process.env.SAUCE_TAGS
            if (tags) {
                tags = tags.split(",")
            }

            /**
             * create a job shell by trying to initialise a session with
             * invalid capabilities
             * ToDo(Christian): remove once own testrunner job API is available
             */
            await remote({
                user: process.env.SAUCE_USERNAME,
                key: process.env.SAUCE_ACCESS_KEY,
                region: region,
                connectionRetryCount: 0,
                logLevel: 'silent',
                capabilities: {
                    browserName: 'Chrome',
                    platformName: '*',
                    browserVersion: '*',
                    'sauce:options': {
                        devX: true,
                        name: jobName,
                        tags: tags,
                        build
                    }
                }
            }).catch((err) => err)

            const { jobs } = await api.listJobs(
                process.env.SAUCE_USERNAME,
                { limit: 1, full: true, name: jobName }
            )
            return jobs && jobs.length && jobs[0].id
        })()
    }

    async onRunStart () {
        log.info('Start video capturing')
        await exec('start-video')
    }

    async onRunComplete (test, { testResults, numFailedTests }) {
        log.info('Finished testrun!')

        const filename = path.basename(testResults[0].testFilePath)
        const hasPassed = numFailedTests === 0
        const sessionId = await this.sessionId

        /**
         * only upload assets if a session was initiated before
         */
        if (!sessionId) {
            return
        }

        await exec('stop-video')

        const logFilePath = path.join(HOME_DIR, 'log.json')
        const containterLogFiles = LOG_FILES.filter(
            (path) => fs.existsSync(path))

        await Promise.all([
            api.uploadJobAssets(
                sessionId,
                {
                    files: [
                        logFilePath,
                        ...containterLogFiles
                    ]
                }
            ).then(
                (resp) => {
                    if (resp.errors) {
                        for (let err of resp.errors) {
                          console.error(err);
                        }
                    }
                },
                (e) => log.error('upload failed:', e.stack)
            ),
            api.updateJob(process.env.SAUCE_USERNAME, sessionId, {
                name: filename,
                passed: hasPassed
            })
        ])

        let domain

        switch (region) {
            case "us-west-1":
                domain = "saucelabs.com"
                break
            default:
                domain = `${region}.saucelabs.com`
        }

        console.log(`\nOpen job details page: https://app.${domain}/tests/${sessionId}\n`)
    }
}
