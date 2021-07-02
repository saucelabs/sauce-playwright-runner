#!/usr/bin/env bash

# Updates browsers.json with the browser versions installed with version of playwright

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

NODE_PATH=$SCRIPT_DIR/../node_modules node $SCRIPT_DIR/print-versions.js > $SCRIPT_DIR/../browsers.json

# Since this script runs as an `after:bump` hook with release-it, add to git index so release-it can commit it
git add $SCRIPT_DIR/../browsers.json