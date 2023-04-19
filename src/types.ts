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
  Kind: string;

  assetsDir: string;
  junitFile: string;
  sauceReportFile: string;
  preExecTimeout: number;
  path: string;
  projectPath: string;
  playwrightOutputFolder: string;

  // Sauce          config.SauceConfig     `yaml:"sauce,omitempty" json:"sauce"`
  sauce: {
    // Region      string            `yaml:"region,omitempty" json:"region"`
    region: Region;
  };

  // Suites        []Suite              `yaml:"suites,omitempty" json:"suites"`
  suites: Suite[];
  // Suite         Suite                `yaml:"suite,omitempty" json:"-"`
  suite: Suite;

  // Playwright     Playwright             `yaml:"playwright,omitempty" json:"playwright"`
  playwright: {
    // ConfigFile string `yaml:"configFile,omitempty" json:"configFile,omitempty"`
    configFile?: string;
  };
}

export interface Suite {
  // Name              string            `yaml:"name,omitempty" json:"name"`
  name: string;
  // Params            SuiteConfig       `yaml:"params,omitempty" json:"param,omitempty"`
  param?: SuiteConfig;
  // PlatformName      string            `yaml:"platformName,omitempty" json:"platformName,omitempty"`
  platformName?: string;
  // TestMatch         []string          `yaml:"testMatch,omitempty" json:"testMatch,omitempty"`
  testMatch?: string[] | string;
  // Env               map[string]string `yaml:"env,omitempty" json:"env,omitempty"`
  env?: Record<string, string>;
  // PreExec           []string          `yaml:"preExec,omitempty" json:"preExec"`
  preExec: string[];
}
//
export interface SuiteConfig {
  // BrowserName string `yaml:"browserName,omitempty" json:"browserName,omitempty"`
  browserName?: Browser;
  // Headless        bool   `yaml:"headless,omitempty" json:"headless,omitempty"`
  headless?: boolean;
  // Project         string `yaml:"project" json:"project,omitempty"`
  project?: string;
  // GlobalTimeout   int    `yaml:"globalTimeout,omitempty" json:"globalTimeout,omitempty"`
  globalTimeout?: number;
  // Timeout         int    `yaml:"timeout,omitempty" json:"timeout,omitempty"`
  timeout?: number;
}
