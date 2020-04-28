const shell = require('shelljs')
const logger = require('@wdio/logger').default

const log = logger('utils')

let lastCommand = Date.now()

global.logs = []

exports.logHelper = (...args) => {
    const sendString = 'SEND ► '
    const receiveString = '◀ RECV'

    if (args[0].includes(receiveString)) {
        const line = args[0].slice(args[0].indexOf('{'))

        try {
            const response = JSON.parse(line)
            if (!response.id) {
                return
            }

            const log = global.logs.find(
                (log) => parseInt(log.id, 10) === parseInt(response.id))

            if (log) {
                log.result = response
            }
        } catch (e) {
            log.error(`Couldn't parse Playwright logs: ${e.stack}`)
        }

        return
    }

    if (!args[0].includes(sendString)) {
        return
    }

    const line = args[0].slice(args[0].indexOf(sendString) + sendString.length)
    const command = JSON.parse(line)
    const duration = (Date.now() - lastCommand) / 1000
    global.logs.push({
        id: command.id,
        screenshot: 0,
        between_commands: duration,
        start_time: Date.now() / 1000,
        suggestion_values: [],
        request: command.params,
        HTTPStatus: 200,
        result: "",
        suggestion: null,
        duration,
        path: command.method,
        in_video_timeline: 0,
        method: "SOCKET",
        statusCode: 0
    })

    lastCommand = Date.now()
}

const COMMAND_TIMEOUT = 5000
exports.exec = async (expression) => {
    const cp = shell.exec(expression, { async: true, silent: true })
    cp.stdout.on('data', (data) => log.info(`${data}`))
    cp.stderr.on('data', (data) => log.info(`${data}`))

    return new Promise((resolve) => {
        const timeout = setTimeout(resolve, COMMAND_TIMEOUT)
        cp.on('close', () => {
            clearTimeout(timeout)
            resolve()
        })
    })
}
