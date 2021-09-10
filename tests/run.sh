#!/usr/bin/env bash

SAUCECTL=$(realpath ${SAUCE_CTL_BINARY})
# build image
echo "Build docker images"
docker build -t saucelabs/stt-playwright-node:local . > /dev/null 2>&1

# suite=result
tests=(basic-js=success basic-ts=success broken-tests=failure config-merging=success)

for i in ${tests[@]}; do
    key=$(echo ${i} | cut -d '=' -f 1)
    result=$(echo ${i} | cut -d '=' -f 2)
    tmpfile=$(mktemp)

    echo "Running ${key}:"
    pushd ./tests/fixtures/${key}/ > /dev/null
    ${SAUCECTL} run -c .sauce/config.yml > ${tmpfile} 2>&1
    RETURN_CODE=${?}
    popd > /dev/null

    echo "Result: ${RETURN_CODE}"
    if ([ "${result}" == "success" ] && [ "${RETURN_CODE}" -ne 0 ]) ||
         ([ "${result}" == "failure" ] && [ "${RETURN_CODE}" -eq 0 ]);then
        cat ${tmpfile}
        rm -f ${tmpfile}

        echo "TEST FAILURE: Result expected is ${result}, and exitCode is ${RETURN_CODE}" 
        exit 1
    else
        # Display warning if there is some
        grep -E "(ERR|WRN)" ${tmpfile}
    fi
    rm -f ${tmpfile}
    echo ""
done
