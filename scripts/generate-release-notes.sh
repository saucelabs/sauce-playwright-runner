#!/usr/bin/env bash

## Add Changelog
echo "## Changelog"
git --no-pager log --no-notes --no-decorate --oneline  v${1}...master

## Add Framework version
PLAYWRIGHT_VER=$(< package-lock.json jq -r '.dependencies["playwright"].version')
PLAYWRIGHT_TEST_VER=$(< package-lock.json jq -r '.dependencies["@playwright/test"].version')
NODEJS_VER=$(grep NODE_VERSION= Dockerfile | cut -d '=' -f 2)

echo ""
echo "## Frameworks"
echo "- Playwright ${PLAYWRIGHT_VER}"
echo "- Playwright-test ${PLAYWRIGHT_TEST_VER}"
echo "- NodeJS ${NODEJS_VER}"


## Add Browser versions
## Be based on release notes from playwright

RELEASE_ID=$(curl -s -f -H "Authorization: token ${GITHUB_TOKEN}" https://api.github.com/repos/microsoft/playwright/releases | jq -r ".[] | select(.tag_name == \"v${PLAYWRIGHT_VER}\") | .id")
TEXT=$(curl -s -f -H "Authorization: token ${GITHUB_TOKEN}" https://api.github.com/repos/microsoft/playwright/releases/${RELEASE_ID} | jq -r '.body' | sed "s/^M//")

echo ""
echo "## Browsers"
echo "${TEXT}" | grep -E '^- Chromium (.*)$'
echo "${TEXT}" | grep -E '^- Mozilla Firefox (.*)$' | sed 's/Mozilla //'
echo "${TEXT}" | grep -E '^- WebKit (.*)$'
