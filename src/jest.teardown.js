const fs = require('fs')
const path = require('path')

afterAll(async () => {
    if (global.browser){
        await global.browser.close().catch(
            (err) => console.error(`Couldn't close browser: ${err.message}`))
    }

    const logFilePath = path.join(process.cwd(), '/log.json')
    fs.writeFileSync(logFilePath, JSON.stringify(global.logs, null, 4))
})
