#!/usr/bin/env bash

## Gather Changelog
CHANGELOG=$(git --no-pager log --no-notes --no-decorate --oneline  v${1}...HEAD)

## Gather Framework version
PLAYWRIGHT_VER=$(< package-lock.json jq -r '.dependencies["playwright"].version')
PLAYWRIGHT_TEST_VER=$(< package-lock.json jq -r '.dependencies["@playwright/test"].version')
NODEJS_VER=$(grep NODE_VERSION= Dockerfile | cut -d '=' -f 2)

## Add Browser versions
## Be based on release notes from playwright

RELEASE_ID=$(curl -s -f -H "Authorization: token ${GITHUB_TOKEN}" https://api.github.com/repos/microsoft/playwright/releases | jq -r ".[] | select(.tag_name == \"v${PLAYWRIGHT_VER}\") | .id")
TEXT=$(curl -s -f -H "Authorization: token ${GITHUB_TOKEN}" https://api.github.com/repos/microsoft/playwright/releases/${RELEASE_ID} | jq -r '.body' | sed "s/^M//")

CHROMIUM_VER=`echo "${TEXT}" | grep -E '^- Chromium (.*)$'`
FIREFOX_VER=`echo "${TEXT}" | grep -E '^- Mozilla Firefox (.*)$' | sed 's/Mozilla //'`
WEBKIT_VER=`echo "${TEXT}" | grep -E '^- WebKit (.*)$'`

## Generate everything
cat <<EOF

## Changelog
${CHANGELOG}

## Frameworks
- Playwright ${PLAYWRIGHT_VER}
- Playwright-test ${PLAYWRIGHT_TEST_VER}
- NodeJS ${NODEJS_VER}

## Browsers
${CHROMIUM_VER}
${FIREFOX_VER}
${WEBKIT_VER}

### Build Info
<details>

- jobId: ${GITHUB_RUN_ID}
- branch: ${GITHUB_REF}

</details>
EOF
