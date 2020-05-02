const fs = require('fs')
const path = require('path')

const { HOME_DIR } = require('./constants')

afterAll(async () => {
    if (global.browser){
        await global.browser.close().catch(
            (err) => console.error(`Couldn't close browser: ${err.message}`))
    }

    const logFilePath = path.join(HOME_DIR, '/log.json')
    fs.writeFileSync(logFilePath, JSON.stringify(global.logs, null, 4))
})
