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
  // Sauce          config.SauceConfig     `yaml:"sauce,omitempty" json:"sauce"`
  sauce: {
    // Region      string            `yaml:"region,omitempty" json:"region"`
    region?: Region;
    metadata?: {
      build?: string;
      tags?: string[];
    };
  };

  // Suites        []Suite              `yaml:"suites,omitempty" json:"suites"`
  suites: Suite[];
  // Suite         Suite                `yaml:"suite,omitempty" json:"-"`
  suite: Suite;

  // Playwright     Playwright             `yaml:"playwright,omitempty" json:"playwright"`
  playwright: {
    // ConfigFile string `yaml:"configFile,omitempty" json:"configFile,omitempty"`
    configFile?: string;
    version: string;
  };

  // WARN: The following properties are set dynamcially by the runner and are not
  // deserialized from the runner config json.
  assetsDir: string;
  junitFile: string;
  sauceReportFile: string;
  preExecTimeout: number;
  path: string;
  projectPath: string;
  playwrightOutputFolder: string;

  args: Record<string, unknown>;
}

export interface Suite {
  // Name              string            `yaml:"name,omitempty" json:"name"`
  name: string;
  // Params            SuiteConfig       `yaml:"params,omitempty" json:"param,omitempty"`
  param: SuiteConfig;
  // TestMatch         []string          `yaml:"testMatch,omitempty" json:"testMatch,omitempty"`
  testMatch: string[] | string;
  // PlatformName      string            `yaml:"platformName,omitempty" json:"platformName,omitempty"`
  platformName: string;
  // Env               map[string]string `yaml:"env,omitempty" json:"env,omitempty"`
  env?: Record<string, string>;
  // PreExec           []string          `yaml:"preExec,omitempty" json:"preExec"`
  preExec: string[];
  // ExcludedTestFiles []string          `yaml:"excludedTestFiles,omitempty" json:"testIgnore"`
  // BUG: The implementation assumes string, but it must be string[]
  testIgnore?: string;
}

export interface SuiteConfig {
  // BrowserName string `yaml:"browserName,omitempty" json:"browserName,omitempty"`
  browserName?: string;
  // Headless        bool   `yaml:"headless,omitempty" json:"headless,omitempty"`
  headless?: boolean;
  // Project         string `yaml:"project" json:"project,omitempty"`
  project?: string;
  // GlobalTimeout   int    `yaml:"globalTimeout,omitempty" json:"globalTimeout,omitempty"`
  globalTimeout?: number;
  // Timeout         int    `yaml:"timeout,omitempty" json:"timeout,omitempty"`
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
    // ConfigFile string `yaml:"configFile,omitempty" json:"configFile,omitempty"`
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
