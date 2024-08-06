import * as fs from 'node:fs';
import * as path from 'node:path';
import { Transform } from 'node:stream';
import * as childProcess from 'node:child_process';
import * as process from 'node:process';

const escapeSequenceRegex = new RegExp(
  // eslint-disable-next-line no-control-regex
  '[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)|(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))',
  'g',
);

export function playwrightRecorder() {
  // console.log is saved out of reportsDir since it is cleared on startup.
  const ws = fs.createWriteStream(path.join(process.cwd(), 'console.log'), {
    flags: 'w+',
    mode: 0o644,
  });
  const stripAsciiTransform = new Transform({
    transform(chunk, _, callback) {
      // list reporter uses escape codes to rewrite lines, strip them to make console output more readable
      callback(null, chunk.toString().replace(escapeSequenceRegex, ''));
    },
  });

  const [nodeBin] = process.argv;
  const child = childProcess.spawn(nodeBin, [
    path.join(__dirname, 'playwright-runner.js'),
    ...process.argv.slice(2),
  ]);

  child.stdout.pipe(process.stdout);
  child.stderr.pipe(process.stderr);
  child.stdout.pipe(stripAsciiTransform).pipe(ws);
  child.stderr.pipe(stripAsciiTransform).pipe(ws);

  child.on('exit', (exitCode) => {
    ws.end();
    process.exit(exitCode ?? 1);
  });
}

if (require.main === module) {
  playwrightRecorder();
}
