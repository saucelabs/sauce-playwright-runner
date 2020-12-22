#!/usr/bin/env node
const yargs = require('yargs/yargs');
const { spawn, execSync } = require('child_process');
const _ = require('lodash');
const path = require('path');
const { shouldRecordVideo, getAbsolutePath, loadRunConfig, toHyphenated } = require('./utils');
const { createjobLegacy, createJobShell } = require('./reporter');
const SauceLabs = require('saucelabs').default;
const { LOG_FILES, HOME_DIR, DESIRED_BROWSER } = require('./constants')
const fs = require('fs');
const glob = require('glob');

const region = process.env.SAUCE_REGION || 'us-west-1';
const jobName = process.env.SAUCE_JOB_NAME || `DevX Playwright Test Run - ${(new Date()).getTime()}`;

const api = new SauceLabs({
  user: process.env.SAUCE_USERNAME,
  key: process.env.SAUCE_ACCESS_KEY,
  region: region
})

async function run (nodeBin, runCfgPath, suiteName) {
  runCfgPath = getAbsolutePath(runCfgPath);
  const runCfg = await loadRunConfig(runCfgPath);
  const cwd = path.dirname(runCfgPath);
  let defaultArgs = {
    param: {
      headful: false,
      video: shouldRecordVideo(),
    },
    reporter: 'junit,line',
  };
  let env = {...process.env};
  //if (process.env.SAUCE_VM) {
    defaultArgs = _.defaultsDeep(defaultArgs, {
      output: path.join(cwd, '__assets__'),
    });
    env.FOLIO_JUNIT_OUTPUT_NAME = path.join(cwd, '__assets__', 'junit.xml');
  //}

  let args = _.defaultsDeep(defaultArgs, runCfg.folio);
  
  const suite = _.find(runCfg.suites, ({name}) => name === suiteName);
  if (!suite) {
    throw new Error(`Could not find suite named 'suiteName'`);
  }
  args = _.defaultsDeep(args, suite);

  const folioBin = path.join(__dirname, '..', 'node_modules', '.bin', 'folio');
  const procArgs = [folioBin];


  for (let [key, value] of Object.entries(args)) {
    key = toHyphenated(key);
    if (key.toLowerCase() === 'name') {
      continue;
    }
    if (value === '') {
      continue;
    }
    if (key === 'param' || key === 'params') {
      procArgs.push(`--param`);
      for (let [paramName, paramValue] of Object.entries(value)) {
        procArgs.push(`${paramName}=${paramValue}`);
      }
    } else {
      procArgs.push(`--${key}`);
      procArgs.push(value);
    }
    
  }

  // TODO: properly format shell args here
  const folioProc = spawn(nodeBin, procArgs, {stdio: 'inherit', cwd, env});

  const folioPromise = new Promise((resolve, reject) => {
    folioProc.on('close', async (code, ...args) => {
      hasPassed = code === 0;
      resolve(hasPassed);
    });
  });

  try {
    const hasPassed = await folioPromise;
    let sessionId;
    async function createJob () {
      let tags = process.env.SAUCE_TAGS;
      if (tags) {
          tags = tags.split(",")
      }
      if (process.env.ENABLE_DATA_STORE) {
          sessionId = await createJobShell(tags, api)
      } else {
          sessionId = await createjobLegacy(tags, api)
      }
      const containerLogFiles = LOG_FILES.filter(
        (path) => fs.existsSync(path));

      // Take the 1st webm video we find and translate it video.mp4
      // TODO: We need to translate all .webm to .mp4 and combine them into one video.mp4
      const webmFiles = glob.sync(path.join(cwd, '__assets__', '**', '*.webm'));
      let videoLocation;
      if (webmFiles.length > 0) {
        videoLocation = path.join(cwd, '__assets__', 'video.mp4');
        try {
          await execSync(`ffmpeg -i ${webmFiles[0]} ${videoLocation}`);
        } catch (e) {
          videoLocation = null;
          console.error(`Failed to convert ${webmFiles[0]} to mp4: '${e}'`);
        }
      }

      let files = [
        path.join(process.cwd(), 'console.log'),
        path.join(cwd, '__assets__', 'junit.xml'), // TOOD: Should add junit.xml.json as well
        ...containerLogFiles
      ];

      if (videoLocation) {
        files.push(videoLocation);
      }

      await Promise.all([
        api.uploadJobAssets(sessionId, {files})
          .then(
            (resp) => {
                if (resp.errors) {
                    for (let err of resp.errors) {
                      console.error(err);
                    }
                }
            },
            (e) => console.error('upload failed:', e.stack)
        ),
        api.updateJob(process.env.SAUCE_USERNAME, sessionId, {
            name: jobName,
            passed: hasPassed
        })
      ]);
    }
    await createJob();
    
    switch (region) {
      case "us-west-1":
        domain = "saucelabs.com"
        break
      default:
        domain = `${region}.saucelabs.com`
    }

    console.log(`\nOpen job details page: https://app.${domain}/tests/${sessionId}\n`)
    process.exit(0);
  } catch (e) {
    console.error(`Could not complete job: '${e}'`);
    process.exit(1);
  }
}

if (require.main === module) {
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
  run(nodeBin, runCfgPath, suiteName);
}