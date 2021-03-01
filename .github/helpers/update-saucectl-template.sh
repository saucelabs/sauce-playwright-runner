#!/usr/bin/env bash

## Add Framework version
TESTCAFE_VER=$(< package-lock.json jq -r '.dependencies["testcafe"].version')

sed -E -i "s/^  version: (.*)$/  version: ${TESTCAFE_VER}/g" .saucetpl/.sauce/config.yml
git add .saucetpl/.sauce/config.yml