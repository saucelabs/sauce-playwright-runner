Sauce Playwright Runner
=======================

Sauce Labs test runner image for [`saucectl`](https://github.com/saucelabs/saucectl) to run Playwright tests using [Sauce Labs Testrunner Toolkit](https://opensource.saucelabs.com/testrunner-toolkit/docs/overview.html). This repository contains the code that is being executed in the container when running a test with `saucectl` in your pipeline or on Sauce Labs.

If you are interested to contribute to this project, please have a look into our [contribution guidelines](https://github.com/saucelabs/sauce-playwright-runner/blob/main/CONTRIBUTING.md).

## Requirements

To work on code the following dependencies are required:

- Docker

## Install

You can pull the latest version of this image via:

```sh
$ docker pull saucelabs/stt-playwright-node:latest
```

## Run

In order to test your changes, just build the image, configure saucectl to run against that image, run saucectl.


```sh
# build image
$ docker build -t saucelabs/stt-playwright-node:local --cache-from saucelabs/stt-playwright-node:latest .
```

Define `docker.image` in your saucectl config:

```yaml
docker:
    image: saucelabs/stt-playwright-node:local
```

Run a saucectl suite in docker mode

```
$ saucectl run --select-suite "some suite configured for docker mode"
```
