import * as path from 'node:path';
import { Transform } from 'node:stream';
import * as childProcess from 'node:child_process';
import * as process from 'node:process';

const escapeSequenceRegex = new RegExp(
  '[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)|(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))',
  'g',
);

export function playwrightRecorder() {
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

  child.stdout.pipe(stripAsciiTransform).pipe(process.stdout);
  child.stderr.pipe(process.stderr);

  child.on('exit', (exitCode) => {
    process.exit(exitCode ?? 1);
  });
}

if (require.main === module) {
  playwrightRecorder();
}
