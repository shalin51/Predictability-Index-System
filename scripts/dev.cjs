const { spawn } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const yarn = process.platform === 'win32' ? 'yarn.cmd' : 'yarn';
const services = ['dev:server', 'dev:dash', 'dev:prediction'];
const children = services.map((script) => spawn(yarn, [script], {
  cwd: root,
  shell: process.platform === 'win32',
  stdio: 'inherit',
}));
let stopping = false;

function stopAll(signal = 'SIGTERM') {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.killed) child.kill(signal);
  }
}

for (const child of children) {
  child.on('error', (error) => {
    console.error(`Development service failed to start: ${error.message}`);
    process.exitCode = 1;
    stopAll();
  });
  child.on('exit', (code, signal) => {
    if (stopping) return;
    if (signal || code !== 0) process.exitCode = code ?? 1;
    stopAll(signal || 'SIGTERM');
  });
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => stopAll(signal));
}
