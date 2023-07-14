#!/usr/bin/env node
import {spawn, exec} from 'node:child_process';
import * as path from 'node:path';
import * as fs from 'node:fs';

import _ from 'lodash';
import {getArgs, prepareNpmEnv, loadRunConfig, escapeXML, preExec} from 'sauce-testrunner-utils';
import * as convert from 'xml-js';

import {runCucumber} from './cucumber-runner';
import type {
  CucumberRunnerConfig,
  Metrics,
  RunnerConfig,
  RunResult,
} from './types';
import * as utils from './utils';

function getPlatformName(platformName: string) {
  if (process.platform.toLowerCase() === 'linux') {
    platformName = 'Linux';
  }

  return platformName;
}

function generateJunitfile(sourceFile: string, suiteName: string, browserName: string, platformName: string) {
  if (!fs.existsSync(sourceFile)) {
    return;
  }


  const xmlData = fs.readFileSync(sourceFile, 'utf8');
  if (!xmlData) {
    return;
  }
  let result = convert.xml2js(xmlData, {compact: true}) as any;
  if (!result.testsuites || !result.testsuites.testsuite) {
    return;
  }

  if (!Array.isArray(result.testsuites.testsuite)) {
    result.testsuites.testsuite = [result.testsuites.testsuite];
  }

  const testsuites: any[] = [];
  let totalTests = 0;
  let totalErrs = 0;
  let totalFailures = 0;
  let totalSkipped = 0;
  let totalTime = 0;
  for (let i = 0; i < result.testsuites.testsuite.length; i++) {
    const testsuite = result.testsuites.testsuite[i] as any;
    if (testsuite._attributes) {
      totalTests += +testsuite._attributes.tests || 0;
      totalFailures += +testsuite._attributes.failures || 0;
      totalErrs += +testsuite._attributes.errors || 0;
      totalSkipped += +testsuite._attributes.skipped || 0;
      totalTime += +testsuite._attributes.time || 0;
    }

    // _attributes
    testsuite._attributes = testsuite._attributes || {};
    testsuite._attributes.id = i;
    const timestamp = new Date(testsuite._attributes.timestamp);
    testsuite._attributes.timestamp = timestamp.toISOString();

    // properties
    testsuite.properties = {
      property: [
        {
          _attributes: {
            name: 'platformName',
            value: getPlatformName(platformName),
          }
        },
        {
          _attributes: {
            name: 'browserName',
            value: browserName,
          }
        }
      ]
    };

    // testcases
    if (!testsuite.testcase) {
      testsuites.push(testsuite);
      continue;
    }
    if (!Array.isArray(testsuite.testcase)) {
      testsuite.testcase = [testsuite.testcase];
    }

    // failure message
    for (let j = 0; j < testsuite.testcase.length; j++) {
      const testcase = testsuite.testcase[j];
      if (testcase.failure) {
        testsuite.testcase[j].failure._cdata = testcase.failure._text || '';
        delete testsuite.testcase[j].failure._text;
      }
    }

    testsuites.push(testsuite);
  }

  result = {
    _declaration: {
      _attributes: {
        version: '1.0',
        encoding: 'utf-8'
      }
    },
    testsuites: {
      _attributes: {
        name: suiteName,
        tests: totalTests,
        failures: totalFailures,
        skipped: totalSkipped,
        errors: totalErrs,
        time: totalTime,
      },
      testsuite: testsuites,
    }
  };

  const opts = {compact: true, spaces: 4, textFn: escapeXML};
  const xmlResult = convert.js2xml(result, opts);
  fs.writeFileSync(sourceFile, xmlResult);
}

async function getCfg(runCfgPath: string, suiteName: string): Promise<RunnerConfig | CucumberRunnerConfig> {
  runCfgPath = utils.getAbsolutePath(runCfgPath);
  const runCfg = loadRunConfig(runCfgPath) as RunnerConfig;

  const suite = _.find(runCfg.suites, ({name}) => name === suiteName);
  if (!suite) {
    throw new Error(`Could not find suite named '${suiteName}'`);
  }
  runCfg.suite = suite;

  const projectPath = path.dirname(runCfgPath);
  if (!fs.existsSync(projectPath)) {
    throw new Error(`Could not find projectPath directory: '${projectPath}'`);
  }
  runCfg.assetsDir = path.join(projectPath, '__assets__');
  if (!fs.existsSync(runCfg.assetsDir)) {
    fs.mkdirSync(runCfg.assetsDir);
  }
  runCfg.junitFile = path.join(runCfg.assetsDir, 'junit.xml');
  runCfg.sauceReportFile = path.join(runCfg.assetsDir, 'sauce-test-report.json');
  runCfg.preExecTimeout = 300;
  runCfg.path = runCfgPath;
  runCfg.projectPath = projectPath;
  if (!runCfg.sauce) {
    runCfg.sauce = {};
  }
  runCfg.sauce.region = runCfg.sauce.region || 'us-west-1';
  runCfg.playwrightOutputFolder = path.join(runCfg.assetsDir, 'test-results');

  return runCfg;
}

async function run(nodeBin: string, runCfgPath: string, suiteName: string) {
  const runCfg = await getCfg(runCfgPath, suiteName);

  const packageInfo = await import(path.join(__dirname, '..', 'package.json'));
  console.log(`Sauce Playwright Runner ${packageInfo.version}`);
  console.log(`Running Playwright ${packageInfo.dependencies?.playwright || ''}`);

  let result: RunResult;
  if (runCfg.Kind === 'playwright-cucumberjs') {
    result = await runCucumber(nodeBin, runCfg);
  } else {
    result = await runPlaywright(nodeBin, runCfg);
    try {
      generateJunitfile(runCfg.junitFile, runCfg.suite.name, runCfg.suite.param.browser, runCfg.suite.platformName);
    } catch (err) {
      console.error(`Failed to generate junit file: ${err}`);
    }
  }

  return result.hasPassed;
}

async function runPlaywright(nodeBin: string, runCfg: RunnerConfig): Promise<RunResult> {
  const excludeParams = ['screenshot-on-failure', 'video', 'slow-mo', 'headless', 'headed'];

  process.env.BROWSER_NAME = runCfg.suite.param.browserName;
  process.env.HEADLESS = runCfg.suite.param.headless === true ? 'true' : '';
  process.env.SAUCE_SUITE_NAME = runCfg.suite.name;
  process.env.SAUCE_ARTIFACTS_DIRECTORY = runCfg.assetsDir;
  if (runCfg.suite.param.browserName === 'chrome') {
    excludeParams.push('browser');
  }

  if (runCfg.playwright.configFile) {
    const playwrightCfgFile = path.join(runCfg.projectPath, runCfg.playwright.configFile);
    if (fs.existsSync(playwrightCfgFile)) {
      process.env.PLAYWRIGHT_CFG_FILE = playwrightCfgFile;
    } else {
      throw new Error(`Could not find playwright config file: '${playwrightCfgFile}'`);
    }
  }
  const suite = runCfg.suite;

  if (suite.param.project) {
    process.env.project = suite.param.project;
  }

  // Copy our runner's playwright config to a custom location in order to
  // preserve the customer's config which we may want to load in the future
  const configFileName =
    await utils.isEsmProject(runCfg.projectPath) ?
      'sauce.config.mjs' :
      'sauce.config.cjs';
  const configFile = path.join(runCfg.projectPath, configFileName);
  fs.copyFileSync(path.join(__dirname, configFileName), configFile);

  const defaultArgs = {
    output: runCfg.playwrightOutputFolder,
    config: configFile,
  };

  const playwrightBin = path.join(__dirname, '..', 'node_modules', '@playwright', 'test', 'cli.js');
  const procArgs = [
    playwrightBin, 'test'
  ];

  // Default value for timeout (30min)
  if (!suite.param.globalTimeout) {
    suite.param.timeout = 1800000;
  }
  let args: Record<string, unknown> = _.defaultsDeep(defaultArgs, utils.replaceLegacyKeys(suite.param));

  // There is a conflict if the playwright project has a `browser` defined,
  // since the job is launched with the browser set by saucectl, which is now set as the job's metadata.
  const isRunProject = Object.keys(args).find((k) => k === 'project');
  if (isRunProject) {
    excludeParams.push('browser');
  }

  // eslint-disable-next-line prefer-const
  for (let [key, value] of Object.entries(args)) {
    key = utils.toHyphenated(key);
    if (excludeParams.includes(key.toLowerCase()) || value === false) {
      continue;
    }
    procArgs.push(`--${key}`);
    if (value !== true) {
      procArgs.push(String(value));
    }
  }

  // Thread testMatch as arrays by default.
  // Older versions saucectl are only providing a single value.
  if (!Array.isArray(suite.testMatch)) {
    suite.testMatch = [suite.testMatch];
  }
  procArgs.push(...suite.testMatch);

  args = _.defaultsDeep(suite, args);
  if (Array.isArray(args.testIgnore) && args.testIgnore.length > 0) {
    process.env.TEST_IGNORE = args.testIgnore.join(',');
  }

  runCfg.args = args;

  const env = {
    ...process.env,
    ...suite.env,
    PLAYWRIGHT_JUNIT_OUTPUT_NAME: runCfg.junitFile,
    SAUCE_REPORT_OUTPUT_NAME: runCfg.sauceReportFile,
    FORCE_COLOR: '0',
  };

  utils.setEnvironmentVariables(env);

  // Install NPM dependencies
  const metrics: Metrics[] = [];

  // Define node/npm path for execution
  const npmBin = path.join(path.dirname(nodeBin), 'node_modules', 'npm', 'bin', 'npm-cli.js');
  const nodeCtx = { nodePath: nodeBin, npmPath: npmBin };

  // runCfg.path must be set for prepareNpmEnv to find node_modules. :(
  const npmMetrics = await prepareNpmEnv(runCfg, nodeCtx);
  metrics.push(npmMetrics);

  const startTime = new Date().toISOString();
  // Run suite preExecs
  if (!await preExec.run(suite, runCfg.preExecTimeout)) {
    return {
      startTime,
      endTime: new Date().toISOString(),
      hasPassed: false,
      metrics,
    };
  }

  exec('ls; find .', (err, stdout, stderr) => {
    if (err) {
      // node couldn't execute the command
      return;
    }
  
    // the *entire* stdout and stderr (buffered)
    console.log(`stdout: ${stdout}`);
    console.log(`stderr: ${stderr}`);
  });
  console.log('procArgs: ', procArgs);

  const playwrightProc = spawn(nodeBin, procArgs, {stdio: 'inherit', cwd: runCfg.projectPath, env});

  const playwrightPromise = new Promise<number | null>((resolve, reject) => {
    playwrightProc.on('error', (err) => {
      reject(err);
    });
    playwrightProc.on('close', (code) => {
      resolve(code);
    });
  });

  let hasPassed = false;
  try {
    const exitCode = await playwrightPromise;
    hasPassed = exitCode === 0;
  } catch (e) {
    console.error(`Could not complete job. Reason: ${e}`);
  }
  const endTime = new Date().toISOString()

  return {
    startTime,
    endTime,
    hasPassed,
    metrics,
  };
}

if (require.main === module) {
  const {nodeBin, runCfgPath, suiteName} = getArgs();
  run(nodeBin, runCfgPath, suiteName)
    .then((passed) => {
      process.exit(passed ? 0 : 1);
    })
    .catch((err) => {
      console.log(err);
      process.exit(1);
    });
}

