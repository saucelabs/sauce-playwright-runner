Sauce Playwright Runner
=======================

Sauce Labs test runner image to run Playwright tests on Sauce.

## Requirements

- Docker

## Install

```sh
$ docker pull saucelabs/sauce-playwright-runner:latest
```

## Run

```sh
# start container
$ docker run --env SAUCE_USERNAME --env SAUCE_ACCESS_KEY -d --name=testrunner saucelabs/sauce-playwright-runner:latest
# push file into container
$ docker cp ./path/to/testfile.test.js testrunner:/home/seluser/tests
# run test
$ docker exec testrunner saucectl run /home/seluser/tests
# stop container
$ docker stop testrunner
```
