const fs = require('fs');

// Store file containing job-details url.
// Path is similar to com.saucelabs.job-info LABEL in Dockerfile.
const OUTPUT_FILE_PATH = '/tmp/output.json';

function exportValueToSaucectl (payload) {
  fs.writeFileSync(OUTPUT_FILE_PATH, JSON.stringify(payload));
}

function updateExportedValueToSaucectl (data) {
  let fileData;
  try {
    const st = fs.statSync(OUTPUT_FILE_PATH);
    if (st.isFile()) {
      fileData = JSON.parse(fs.readFileSync(OUTPUT_FILE_PATH)) || {};
    }
  } catch (e) {}
  fileData = { ...fileData, ...data };
  exportValueToSaucectl(fileData);
}

module.exports = {
  exportValueToSaucectl, updateExportedValueToSaucectl,
};