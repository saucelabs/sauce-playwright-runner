import { spawn } from 'node:child_process';
import * as path from 'node:path';
import { setTimeout } from 'node:timers';
import { prepareNpmEnv, preExec } from 'sauce-testrunner-utils';

import type { CucumberRunnerConfig } from './types';
import * as utils from './utils';
import { NodeContext } from 'sauce-testrunner-utils/lib/types';

export function buildArgs(runCfg: CucumberRunnerConfig, cucumberBin: string) {
  const paths: string[] = [];
  runCfg.suite.options.paths.forEach((p) => {
    paths.push(path.join(runCfg.projectPath, p));
  });
  const procArgs = [
    cucumberBin,
    ...paths,
    '--force-exit',
    '--require-module',
    'ts-node/register',
    // NOTE: The Cucumber formatter (--format) option uses the "type":"path" format.
    // If the "path" is not specified, the output defaults to stdout.
    // Cucumber supports only one stdout formatter; if multiple are specified,
    // the last one listed takes precedence.
    //
    // To ensure the Sauce test report file is reliably generated and not overridden
    // by a user-specified stdout formatter, configure the following:
    // 1. In the --format option, set the output to a file (e.g., cucumber.log) to
    //    avoid writing to stdout.
    // 2. Use the --format-options flag to explicitly specify the outputFile
    //    (e.g., sauce-test-report.json).
    //
    // Both settings must be configured correctly to ensure the Sauce test report file is generated.
    '--format',
    '"@saucelabs/cucumber-reporter":"cucumber.log"',
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
    procArgs.push(normalizeFormat(format, runCfg.assetsDir));
  });

  if (runCfg.suite.options.parallel) {
    procArgs.push('--parallel');
    procArgs.push(runCfg.suite.options.parallel.toString(10));
  }

  return procArgs;
}

/**
 * Normalizes a Cucumber-js format string.
 *
 * This function handles structured inputs in the format `key:value`, `"key:value"`,
 * or `"key":"value"` and returns a normalized string in the form `"key":"value"`.
 * For simple inputs (e.g., `usage`) or unstructured formats, the function returns the
 * input unchanged.
 *
 * If the input starts with `file://`, an error is thrown to indicate an invalid format.
 *
 * @param {string} format - The input format string. Examples include:
 *                          - `"key:value"`
 *                          - `"key":"value"`
 *                          - `key:value`
 *                          - `usage`
 *                          - `"file://implementation":"output_file"`
 * @param {string} assetDir - The directory to prepend to the value for relative paths.
 * @returns {string} The normalized format string.
 *
 * Examples:
 * - Input: `"html:formatter/report.html"`, `"/project/assets"`
 *   Output: `"html":"/project/assets/formatter/report.html"`
 * - Input: `"usage"`, `"/project/assets"`
 *   Output: `"usage"`
 * - Input: `"file://implementation":"output_file"`, `"/project/assets"`
 *   Output: `"file://implementation":"output_file"` (unchanged)
 */
export function normalizeFormat(format: string, assetDir: string): string {
  // Formats starting with file:// are not supported by the current implementation.
  // Restrict users from using this format.
  if (format.startsWith('file://')) {
    throw new Error(
      `Invalid format setting detected. The provided format "${format}" is not allowed.`,
    );
  }
  // Try to match structured inputs in the format key:value, "key:value", or "key":"value".
  let match = format.match(/^"?([^:]+):"?([^"]+)"?$/);

  if (!match) {
    if (!format.startsWith('"file://')) {
      return format;
    }

    // Match file-based structured inputs like "file://implementation":"output_file".
    match = format.match(/^"([^"]+)":"([^"]+)"$/);
  }

  if (!match) {
    return format;
  }

  let [, key, value] = match;
  key = key.replaceAll('"', '');
  value = value.replaceAll('"', '');

  return `"${key}":"${path.join(assetDir, value)}"`;
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
    ...cfg.suite.options.formatOptions,
  };
}
