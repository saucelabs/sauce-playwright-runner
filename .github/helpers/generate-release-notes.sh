#!/usr/bin/env bash

## Gather Changelog
CHANGELOG=$(git --no-pager log --no-notes --no-decorate --oneline  v${1}...HEAD)

## Gather Framework version
PLAYWRIGHT_VER=$(< package-lock.json jq -r '.packages[""].dependencies["playwright"]')
PLAYWRIGHT_TEST_VER=$(< package-lock.json jq -r '.packages[""].dependencies["@playwright/test"]')
NODEJS_VER=$(cat .nvmrc | tr -d "v")

## Add Browser versions

CHROMIUM_VER=$(node ./scripts/print-browser-version.js 'chromium')
FIREFOX_VER=$(node ./scripts/print-browser-version.js 'firefox')
WEBKIT_VER=$(node ./scripts/print-browser-version.js 'webkit')

## Generate everything
cat <<EOF

## Changelog
${CHANGELOG}

## Frameworks
- Playwright ${PLAYWRIGHT_VER}
- Playwright-test ${PLAYWRIGHT_TEST_VER}
- NodeJS ${NODEJS_VER}

## Browsers
- Chromium ${CHROMIUM_VER}
- Firefox ${FIREFOX_VER}
- Webkit ${WEBKIT_VER}

### Build Info
<details>

- jobId: ${GITHUB_RUN_ID}
- branch: ${GITHUB_REF}

</details>
EOF
