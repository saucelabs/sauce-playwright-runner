
const fs = require('fs');
const path = require('path');
const stream = require('stream');
const childProcess = require('child_process');

function folioRecorder () {
  // console.log is saved out of reportsDir since it is cleared on startup.
  const fd = fs.openSync(path.join(process.cwd(), 'console.log'), 'w+', 0o644);
  const ws = stream.Writable({
    write (data, encoding, cb) { fs.write(fd, data, undefined, encoding, cb); },
  });

  const [nodeBin] = process.argv;
  const child = childProcess.spawn(nodeBin, [path.join(__dirname, 'folio-runner.js'), ...process.argv.slice(2)]);

  child.stdout.pipe(process.stdout);
  child.stderr.pipe(process.stderr);
  child.stdout.pipe(ws);
  child.stderr.pipe(ws);

  child.on('exit', (exitCode) => {
    fs.closeSync(fd);
    process.exit(exitCode);
  });
}

if (require.main === module) {
  (async () => await folioRecorder())();
}

exports.folioRecorder = folioRecorder;
