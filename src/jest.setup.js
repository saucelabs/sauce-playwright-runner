const path = require('path')

const got = require('got')
const playwright = require('playwright')

const { CHROME_DEFAULT_PATH, JEST_TIMEOUT, SUPPORTED_BROWSER, LAUNCH_ARGS } = require('./constants')
const { logHelper } = require('./utils')

jest.setTimeout(process.env.JEST_TIMEOUT || JEST_TIMEOUT)

global.logs = []

beforeAll(async () => {
    const desiredBrowser = process.env.BROWSER_NAME || 'chromium'

    if (!playwright[desiredBrowser]) {
        throw new Error(`browser name "${desiredBrowser}" not supported, choose between ${SUPPORTED_BROWSER.join(', ')}`)
    }

    global.browser = await playwright[desiredBrowser].launch({
        headless: !Boolean(process.env.DISPLAY),
        args: LAUNCH_ARGS[desiredBrowser],
        logger: {
            isEnabled: () => true,
            log: logHelper
        }
    }).catch((err) => { err })

    if (global.browser.err) {
        throw new Error(`Couldn't start Playwright: ${global.browser.err.message}`)
    }

    // Create a new incognito browser context.
    global.context = await browser.newContext();
    // Create a new page in a pristine context.
    global.page = await context.newPage();

    if (!process.env.CI) {
        const req = got('http://localhost:9223/json')
        const pages = await req.json().catch((err) => err)
        if (pages && pages.length) {
            console.log(`Watch test: https://chrome-devtools-frontend.appspot.com/serve_file/@ec99b9f060de3f065f466ccd2b2bfbf17376b61e/devtools_app.html?ws=localhost:9222/devtools/page/${pages[0].id}&remoteFrontend=true`);
        }
    }
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
