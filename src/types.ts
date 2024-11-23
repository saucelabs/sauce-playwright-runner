import type { Region } from '@saucelabs/testcomposer';

export interface RunnerConfig {
  // NOTE: Kind is serialized by saucectl with a capital 'K' ¯\_(ツ)_/¯
  Kind: 'playwright';
  sauce: {
    region?: Region;
    metadata?: {
      build?: string;
      tags?: string[];
    };
  };

  suites: Suite[];

  playwright: {
    configFile?: string;
    version: string;
  };

  nodeVersion?: string;

  // WARN: The following properties are set dynamically by the runner and are not
  // deserialized from the runner config json. They should technically be marked
  // as optional, but the runners treat them as required so type them as such.
  assetsDir: string;
  junitFile: string;
  sauceReportFile: string;
  preExecTimeout: number;
  path: string;
  projectPath: string;
  playwrightOutputFolder?: string;
  // webAssetsDir contains assets compatible with the Sauce Labs web UI.
  webAssetsDir?: string;
  suite: Suite;

  args: Record<string, unknown>;
  artifacts: Artifacts;
}

export interface Suite {
  name: string;
  param: SuiteConfig;
  testMatch: string[] | string;
  platformName: string;
  env?: Record<string, string>;
  preExec: string[];
  testIgnore?: string[];
  timeout?: number;
}

export interface SuiteConfig {
  browserName?: string;
  headless?: boolean;
  project?: string;
  globalTimeout?: number;
  timeout?: number;

  browser: string;
  headed?: boolean;
  headful?: boolean;
}

export interface CucumberRunnerConfig {
  Kind: 'playwright-cucumberjs';
  sauce: {
    metadata?: {
      build?: string;
      tags?: string[];
    };
    region?: Region;
  };
  playwright: {
    configFile?: string;
    version: string;
  };
  nodeVersion?: string;
  suite: CucumberSuite;
  assetsDir: string;
  sauceReportFile: string;
  path: string;
  preExecTimeout: number;
  projectPath: string;
  artifacts?: Artifacts;
}

export interface CucumberSuite {
  browserName?: string;
  browserOptions?: string;
  name: string;
  env: Record<string, string>;
  preExec: string[];
  param: {
    browserName: string;
  };
  options: {
    config?: string;
    name?: string;
    backtrace?: boolean;
    require?: string[];
    import?: string[];
    tags?: string[];
    format?: string[];
    formatOptions?: object;
    parallel?: number;
    paths: string[];
  };
  timeout?: number;
}

export interface Artifacts {
  retain?: {
    [key: string]: string;
  };
}
