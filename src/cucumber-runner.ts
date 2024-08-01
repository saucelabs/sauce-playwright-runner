import { spawn } from 'node:child_process';
import * as path from 'node:path';
import { setTimeout } from 'node:timers';
import { prepareNpmEnv, preExec } from 'sauce-testrunner-utils';

import type { CucumberRunnerConfig } from './types';
import * as utils from './utils';
import { NodeContext } from 'sauce-testrunner-utils/lib/types';

function buildArgs(runCfg: CucumberRunnerConfig, cucumberBin: string) {
  const paths: string[] = [];
  runCfg.suite.options.paths.forEach((p) => {
    paths.push(path.join(runCfg.projectPath, p));
  });
  const procArgs = [
    cucumberBin,
    ...paths,
    '--publish-quiet', // Deprecated in 9.4.0. Will be removed in 11.0.0 or later.
    '--force-exit',
    '--require-module',
    'ts-node/register',
    '--format',
    '@saucelabs/cucumber-reporter',
    '--format-options',
    JSON.stringify(buildFormatOption(runCfg)),
  ];
  if (runCfg.suite.options.config) {
    procArgs.push('-c');
    // NOTE: cucumber-js constructs the absolute path automatically and expects a relative path here. options.config should already be relative to the project path
    // so just pass it along as is.
    procArgs.push(runCfg.suite.options.config);
  }
  if (runCfg.suite.options.name) {
    procArgs.push('--name');
    procArgs.push(runCfg.suite.options.name);
  }
  if (runCfg.suite.options.backtrace) {
    procArgs.push('-b');
    procArgs.push('true');
  }
  runCfg.suite.options.require?.forEach((req) => {
    procArgs.push('-r');
    procArgs.push(path.join(runCfg.projectPath, req));
  });
  runCfg.suite.options.import?.forEach((im) => {
    procArgs.push('-i');
    procArgs.push(path.join(runCfg.projectPath, im));
  });
  runCfg.suite.options.tags?.forEach((tag) => {
    procArgs.push('-t');
    procArgs.push(tag);
  });
  runCfg.suite.options.format?.forEach((format) => {
    procArgs.push('--format');
    const opts = format.split(':');
    if (opts.length === 2) {
      procArgs.push(`${opts[0]}:${path.join(runCfg.assetsDir, opts[1])}`);
    } else {
      procArgs.push(format);
    }
  });
  if (runCfg.suite.options.parallel) {
    procArgs.push('--parallel');
    procArgs.push(runCfg.suite.options.parallel.toString(10));
  }

  return procArgs;
}

export async function runCucumber(
  nodeBin: string,
  runCfg: CucumberRunnerConfig,
): Promise<boolean> {
  process.env.BROWSER_NAME = runCfg.suite.browserName;
  process.env.BROWSER_OPTIONS = runCfg.suite.browserOptions;
  process.env.SAUCE_SUITE_NAME = runCfg.suite.name;
  process.env.SAUCE_ARTIFACTS_DIRECTORY = runCfg.assetsDir;
  utils.setEnvironmentVariables({
    ...process.env,
    ...runCfg.suite.env,
    SAUCE_REPORT_OUTPUT_NAME: runCfg.sauceReportFile,
  });

  // Define node/npm path for execution
  const npmBin = path.join(
    path.dirname(nodeBin),
    'node_modules',
    'npm',
    'bin',
    'npm-cli.js',
  );
  const nodeCtx: NodeContext = {
    nodePath: nodeBin,
    npmPath: npmBin,
    useGlobals: !!runCfg.nodeVersion,
  };

  // Install NPM dependencies
  await prepareNpmEnv(runCfg, nodeCtx);

  // Run suite preExecs
  if (!(await preExec.run(runCfg.suite, runCfg.preExecTimeout))) {
    return false;
  }

  const cucumberBin = path.join(
    runCfg.projectPath,
    'node_modules',
    '@cucumber',
    'cucumber',
    'bin',
    'cucumber-js',
  );
  const procArgs = buildArgs(runCfg, cucumberBin);
  const proc = spawn(nodeBin, procArgs, { stdio: 'inherit', env: process.env });

  // saucectl suite.timeout is in nanoseconds, convert to seconds
  const timeout = (runCfg.suite.timeout || 0) / 1_000_000_000 || 30 * 60; // 30min default

  const timeoutPromise = new Promise<boolean>((resolve) => {
    setTimeout(() => {
      console.error(`Job timed out after ${timeout} seconds`);
      resolve(false);
    }, timeout * 1000);
  });

  const cucumberPromise = new Promise<boolean>((resolve) => {
    proc.on('close', (code) => {
      resolve(code === 0);
    });
  });

  try {
    return await Promise.race([timeoutPromise, cucumberPromise]);
  } catch (e) {
    console.error(`Failed to run Cucumber.js: ${e}`);
  }

  return false;
}

function buildFormatOption(cfg: CucumberRunnerConfig) {
  return {
    upload: false,
    suiteName: cfg.suite.name,
    build: cfg.sauce.metadata?.build,
    tags: cfg.sauce.metadata?.tags,
    outputFile: path.join(cfg.assetsDir, 'sauce-test-report.json'),
  };
}
