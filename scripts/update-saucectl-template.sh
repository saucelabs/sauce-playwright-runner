#!/usr/bin/env bash

## Add Framework version
CYPRESS_VER=$(< package-lock.json jq -r '.dependencies["cypress"].version')

sed -E -i "s/^  version: (.*)$/  version: ${CYPRESS_VER}/g" .saucetpl/.sauce/config.yml
git add .saucetpl/.sauce/config.yml