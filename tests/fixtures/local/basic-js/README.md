# Basic Playwright Test
A basic playwright test that can be run in Sauce Cloud. Configuration is set in `.sauce/config.yml`

## Usage

### Prerequisites
* Install saucectl `npm install -g saucectl` (must be minimum 0.27.1)
* Have `SAUCE_USERNAME` and `SAUCE_ACCESS_KEY` set in your environment

### Sauce Cloud
To run this on the cloud run

`saucectl run --ccy <concurrency> --region <region>`

Example:

`saucectl run --ccy 5 --region us-west-1`
