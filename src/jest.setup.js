const path = require('path')

const got = require('got')
const { chromium } = require('playwright')
const debug = require(
    path.join(
        path.dirname(require.resolve('playwright')),
        'node_modules',
        'debug'
    )
)

const { CHROME_DEFAULT_PATH, JEST_TIMEOUT, CHROME_ARGS } = require('./constants')
const { logHelper } = require('./utils')
debug.log = logHelper

jest.setTimeout(process.env.JEST_TIMEOUT || JEST_TIMEOUT)

beforeAll(async () => {
    global.browser = await chromium.launch({
        headless: !Boolean(process.env.DISPLAY),
        args: CHROME_ARGS,
        executablePath: process.env.CHROME_BINARY_PATH || CHROME_DEFAULT_PATH
    }).catch((err) => {
        console.error(`Couldn't start Playwright: ${err.message}`)
    })

    const req = got('http://localhost:9223/json')
    const pages = await req.json()
    console.log(`Watch test: https://chrome-devtools-frontend.appspot.com/serve_file/@ec99b9f060de3f065f466ccd2b2bfbf17376b61e/devtools_app.html?ws=localhost:9222/devtools/page/${pages[0].id}&remoteFrontend=true`);
})

const monkeyPatchedTest = (origFn) => (testName, testFn) => {
    function patchedFn (...args) {
        global.logs.push({
            status: 'info',
            message: testName,
            screenshot: null
        })
        return testFn.call(this, ...args)
    }
    return origFn(testName, patchedFn)
}

global.it = monkeyPatchedTest(global.it)
global.test = monkeyPatchedTest(global.test)
