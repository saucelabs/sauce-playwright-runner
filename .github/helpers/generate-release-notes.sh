#!/usr/bin/env bash

## Gather Changelog
CHANGELOG=$(git --no-pager log --no-notes --no-decorate --oneline  v${1}...HEAD)

## Gather Framework version
TESTCAFE_VER=$(< package-lock.json jq -r '.dependencies["testcafe"].version')
NODEJS_VER=$(grep NODE_VERSION= Dockerfile | cut -d '=' -f 2)

## Gather Browser versions
BASE_IMAGE=$(grep FROM Dockerfile | cut -d ' ' -f 2)
docker pull "${BASE_IMAGE}" > /dev/null 2>&1 || exit 1
FF_VER=$(docker inspect ${BASE_IMAGE} | jq -r '.[0].ContainerConfig.Env | .[] | select(. | startswith("FF_VER="))' | cut -d '=' -f 2)
CHROME_VER=$(docker inspect ${BASE_IMAGE} | jq -r '.[0].ContainerConfig.Env | .[] | select(. | startswith("CHROME_VER="))' | cut -d '=' -f 2)

## Generate everything
cat <<EOF

## Changelog
${CHANGELOG}

## Frameworks
- TestCafe ${TESTCAFE_VER}
- NodeJS ${NODEJS_VER}

## Browsers
- Firefox ${FF_VER}
- Chrome ${CHROME_VER}

### Build Info
<details>

- jobId: ${GITHUB_RUN_ID}
- branch: ${GITHUB_REF}

</details>
EOF
