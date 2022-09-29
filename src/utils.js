const shell = require('shelljs');
const logger = require('@wdio/logger').default;
const path = require('path');
const yargs = require('yargs/yargs');

const log = logger('utils');

function getAbsolutePath (pathToDir) {
  if (path.isAbsolute(pathToDir)) {
    return pathToDir;
  }
  return path.join(process.cwd(), pathToDir);
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

function exec (expression, {suppressLogs = false}) {
  const COMMAND_TIMEOUT = 5000;
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

function replaceLegacyKeys (args) {
  // browserName => browser
  if ('browserName' in args) {
    if (!('browser' in args)) {
      args.browser = args.browserName;
    }
    delete args.browserName;
  }
  // headful => headed
  if ('headful' in args) {
    if (!('headed' in args)) {
      args.headed = args.headful;
    }
    delete args.headful;
  }
  return args;
}

function setEnvironmentVariables (envVars = {}) {
  for (const [key, value] of Object.entries(envVars)) {
    process.env[key] = value;
  }
}

module.exports = {
  exec, getAbsolutePath, toHyphenated,
  getArgs, replaceLegacyKeys, setEnvironmentVariables };
