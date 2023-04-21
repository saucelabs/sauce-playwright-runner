import type { Region } from '@saucelabs/testcomposer';

export type Browser = 'chromium' | 'firefox' | 'webkit' | 'chrome';

export interface Metrics {
  name: string;
  data: {
    install: {duration: number};
    rebuild?: {duration: number};
    setup: {duration: number};
  };
}

export interface RunResult {
  startTime: string;
  hasPassed: boolean;
  endTime: string;
  metrics: Metrics[];
}

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

  // WARN: The following properties are set dynamcially by the runner and are not
  // deserialized from the runner config json. They should technically be marked
  // as optional, but the runners treat them as required so type them as such.
  assetsDir: string;
  junitFile: string;
  sauceReportFile: string;
  preExecTimeout: number;
  path: string;
  projectPath: string;
  playwrightOutputFolder: string;
  suite: Suite;

  args: Record<string, unknown>;
}

export interface Suite {
  name: string;
  param: SuiteConfig;
  testMatch: string[] | string;
  platformName: string;
  env?: Record<string, string>;
  preExec: string[];
  testIgnore?: string[];
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
  suite: CucumberSuite;
  assetsDir: string;
  sauceReportFile: string;
  path: string;
  preExecTimeout: number;
  projectPath: string;
}

export interface CucumberSuite {
  browserName?: string;
  browserOptions?: string;
  name: string;
  env: Record<string, string>;
  preExec: string[];
  options: {
    config?: string;
    name?: string;
    backtrace?: boolean;
    require?: string[];
    import?: string[];
    tags?: string[];
    format?: string[];
    parallel?: number;
    paths: string[];
  };
}
