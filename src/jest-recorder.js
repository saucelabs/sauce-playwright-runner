#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const stream = require('stream');
const child_process = require('child_process');

const jestRecorder = () => {
  const fd = fs.openSync(path.join(__dirname, '..', 'console.log'), 'w+', 0o644);
  const ws = stream.Writable({
    write (data, encoding, cb) { fs.write(fd, data, undefined, encoding, cb); },
  });

  const child = child_process.spawn('jest', ['--no-colors', ...process.argv.slice(2)]);

  child.stdout.pipe(process.stdout);
  child.stderr.pipe(process.stderr);
  child.stdout.pipe(ws);
  child.stderr.pipe(ws);

  child.on('exit', (exitCode) => {
    fs.closeSync(fd);
    process.exit(exitCode);
  });
};

exports.jestRecorder = jestRecorder;