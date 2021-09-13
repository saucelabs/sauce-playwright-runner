const fs = require('fs');
const path = require('path');
const { Transform } = require('stream');
const childProcess = require('child_process');

const escapeSequenceRegex = new RegExp('[\\u001b]\\[2K|[\\u001b]\\[0G', 'g');

function playwrightRecorder () {
  // console.log is saved out of reportsDir since it is cleared on startup.
  const ws = fs.createWriteStream(path.join(process.cwd(), 'console.log'), { flags: 'w+', mode: 0o644 });
  const stripAsciiTransform = new Transform({
    transform (chunk, encoding, callback) {
      // list reporter uses escape codes to rewrite lines, strip them to make console output more readable
      callback(null, chunk.toString().replace(escapeSequenceRegex, ''));
    },
  });

  const [nodeBin] = process.argv;
  const child = childProcess.spawn(nodeBin, [path.join(__dirname, 'playwright-runner.js'), ...process.argv.slice(2)]);

  child.stdout.pipe(process.stdout);
  child.stderr.pipe(process.stderr);
  child.stdout.pipe(stripAsciiTransform).pipe(ws);
  child.stderr.pipe(ws);

  child.on('exit', (exitCode) => {
    ws.end();
    process.exit(exitCode);
  });
}

if (require.main === module) {
  (async () => await playwrightRecorder())();
}

exports.playwrightRecorder = playwrightRecorder;
