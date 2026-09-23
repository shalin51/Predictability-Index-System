const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const predictionRoot = path.join(root, 'prediction-server');
const pythonCandidates = process.platform === 'win32'
  ? [path.join(predictionRoot, '.venv', 'Scripts', 'python.exe')]
  : [path.join(predictionRoot, '.venv', 'bin', 'python')];
const python = pythonCandidates.find((candidate) => fs.existsSync(candidate)) || 'python';

const child = spawn(
  python,
  ['-m', 'uvicorn', 'prediction_server.main:app', '--reload', '--host', '127.0.0.1', '--port', '4100'],
  { cwd: predictionRoot, stdio: 'inherit' }
);

child.on('error', (error) => {
  console.error(`Unable to start prediction server: ${error.message}`);
  process.exitCode = 1;
});

child.on('exit', (code, signal) => {
  process.exit(code ?? (signal ? 0 : 1));
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    if (!child.killed) child.kill(signal);
  });
}
