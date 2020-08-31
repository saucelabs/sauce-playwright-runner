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
$ docker pull saucelabs/stt-playwright-jest-node:latest
```

## Run

In order to test your changes, just build the image and run a test with an example file:

```sh
# build image
$ docker build -t saucelabs/stt-playwright-jest-node:latest --cache-from saucelabs/stt-playwright-jest-node:latest .
# start container
$ docker run --env SAUCE_USERNAME --env SAUCE_ACCESS_KEY -d --name=testrunner saucelabs/stt-playwright-jest-node:latest
# push file into container
$ docker cp ./path/to/testfile.test.js testrunner:/home/seluser/tests
# run test
$ docker exec testrunner saucectl run /home/seluser/tests
# stop container
$ docker stop testrunner
```
