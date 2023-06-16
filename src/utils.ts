import * as path from 'node:path';
import { readFile } from 'node:fs/promises';

import shell from 'shelljs';
import logger from '@wdio/logger';
import { SuiteConfig } from './types';

const log = logger('utils');

export function getAbsolutePath (pathToDir: string) {
  if (path.isAbsolute(pathToDir)) {
    return pathToDir;
  }
  return path.join(process.cwd(), pathToDir);
}

/**
 * Convert a camel-case or snake-case string into a hyphenated one
 */
export function toHyphenated (str: string) {
  const out: string[] = [];
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

export function exec (expression: string, {suppressLogs = false}) {
  const COMMAND_TIMEOUT = 5000;
  const cp = shell.exec(expression, { async: true, silent: true });
  if (!suppressLogs) {
    cp.stdout?.on('data', (data) => log.info(`${data}`));
    cp.stderr?.on('data', (data) => log.info(`${data}`));
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(resolve, COMMAND_TIMEOUT);
    cp.on('close', (code) => {
      clearTimeout(timeout);
      resolve(code);
    });
  });
}

export function replaceLegacyKeys (config: SuiteConfig) {
  const args: Record<string, unknown> = {};

  let k: keyof SuiteConfig;

  for (k in config) {
    args[k] = config[k];
  }
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

export function setEnvironmentVariables (envVars: Record<string, string> = {}) {
  if (!envVars) {
    return;
  }
  for (const [key, value] of Object.entries(envVars)) {
    process.env[key] = value;
  }
}

/**
 * Check project's module type from an included package.json and return true
 * if configured for ESM.
 */
export async function isEsmProject(projectPath?: string) {
  if (!projectPath) {
    console.warn('Project path expected, but is undefined');
    return false
  }

  const packagePath = path.join(projectPath, 'package.json');
  let packageJson: unknown;
  try {
    const contents = await readFile(packagePath, { encoding: 'utf-8' });
    packageJson = JSON.parse(contents);
  } catch {
    return false
  }

  return (
    packageJson &&
    typeof packageJson === 'object' &&
    'type' in packageJson &&
    packageJson.type === 'module'
  );
}
