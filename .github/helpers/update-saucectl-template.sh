#!/usr/bin/env bash

## Add Framework version
PLAYWRIGHT_VER=$(< package-lock.json jq -r '.dependencies["playwright"].version')

sed -E -i "s/^  version: (.*)$/  version: ${PLAYWRIGHT_VER}/g" .saucetpl/.sauce/config.yml
git add .saucetpl/.sauce/config.yml