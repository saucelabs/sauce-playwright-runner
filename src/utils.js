const shell = require('shelljs')
const logger = require('@wdio/logger').default

const log = logger('utils')
const sendString = 'SEND ► '
const receiveString = '◀ RECV'

let lastCommand = Date.now()

exports.logHelper = (type, severity, message, args, hints) => {
    if (message.includes(receiveString)) {
        const line = message.slice(message.indexOf('{'))

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

    if (!message.includes(sendString)) {
        return
    }

    const line = message.slice(message.indexOf(sendString) + sendString.length)

    try {
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
    } catch (e) {
        /**
         * some lines can't be parsed due to borked Playwright log lines, e.g.:
         * "{"id":6 [evaluate injected script]}"
         */
        log.error(`Couldn't parse log line: ${line}`)
    }
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
