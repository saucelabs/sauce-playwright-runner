const shell = require('shelljs');
const logger = require('@wdio/logger').default;
const path = require('path');
const yargs = require('yargs/yargs');

const log = logger('utils');
const sendString = 'SEND ► ';
const receiveString = '◀ RECV';

global._timeOfLastCommand = Date.now();

// eslint-disable-next-line no-unused-vars
function logHelper (type, severity, message, args, hints) {
  if (message.includes(receiveString)) {
    const line = message.slice(message.indexOf('{'));

    try {
      const response = JSON.parse(line);
      if (!response.id) {
        return;
      }

      const log = global.logs.find(
                (log) => parseInt(log.id, 10) === parseInt(response.id, 10));

      if (log) {
        log.result = response;
      }
    } catch (e) {
      log.error(`Couldn't parse Playwright logs: ${e.stack}`);
    }

    return;
  }

  if (!message.includes(sendString)) {
    return;
  }

  const line = message.slice(message.indexOf(sendString) + sendString.length);

  try {
    const command = JSON.parse(line);
    const duration = (Date.now() - global._timeOfLastCommand) / 1000;
    global.logs.push({
      id: command.id,
      screenshot: 0,
      between_commands: duration,
      start_time: Date.now() / 1000,
      suggestion_values: [],
      request: command.params,
      HTTPStatus: 200,
      result: '',
      suggestion: null,
      duration,
      path: command.method,
      in_video_timeline: 0,
      method: 'SOCKET',
      statusCode: 0
    });
  } catch (e) {
    /**
         * some lines can't be parsed due to borked Playwright log lines, e.g.:
         * "{"id":6 [evaluate injected script]}"
         */
    log.error(`Couldn't parse log line: ${line}`);
  }
  global._timeOfLastCommand = Date.now();
}

function getAbsolutePath (pathToDir) {
  if (path.isAbsolute(pathToDir)) {
    return pathToDir;
  }
  return path.join(process.cwd(), pathToDir);
}

function shouldRecordVideo () {
  if (process.env.SAUCE_VM) {
    return false;
  }
  let isVideoRecording = process.env.SAUCE_VIDEO_RECORDING;
  if (isVideoRecording === undefined) {
    return true;
  }
  let videoOption = String(isVideoRecording).toLowerCase();
  return videoOption === 'true' || videoOption === '1';
}

/**
 * Convert a camel-case or snake-case string into a hyphenated one
 *
 * @param {str} str String to hyphenate
 */
function toHyphenated (str) {
  const out = [];
  for (let i = 0; i < str.length; i++) {
    const char = str.charAt(i);
    if (char.toUpperCase() === char && char.toLowerCase() !== char) {
      out.push('-');
      out.push(char.toLowerCase());
    } else {
      out.push(char);
    }
  }
  return out.join('');
}

const COMMAND_TIMEOUT = 5000;

function exec (expression, {suppressLogs = false}) {
  const cp = shell.exec(expression, { async: true, silent: true });
  if (!suppressLogs) {
    cp.stdout.on('data', (data) => log.info(`${data}`));
    cp.stderr.on('data', (data) => log.info(`${data}`));
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(resolve, COMMAND_TIMEOUT);
    cp.on('close', () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

function getArgs () {
  const argv = yargs(process.argv.slice(2))
      .command('$0', 'the default command')
      .option('runCfgPath', {
        alias: 'r',
        type: 'string',
        description: 'Path to sauce runner json',
      })
      .option('suiteName', {
        alias: 's',
        type: 'string',
        description: 'Select the suite to run'
      })
      .demandOption(['runCfgPath', 'suiteName'])
      .argv;
  const { runCfgPath, suiteName } = argv;
  const nodeBin = process.argv[0];
  return { nodeBin, runCfgPath, suiteName };
}

async function supportsFfmpeg () {

}

module.exports = {
  exec, logHelper, shouldRecordVideo, getAbsolutePath, toHyphenated,
  getArgs, supportsFfmpeg };
