#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const REQUIRED_VARS = [
  'DASHBOARD_PORT',
  'VITE_API_BASE_URL',
  'VITE_APP_ENV',
];

function readEnvFile(envFilePath) {
  const content = fs.readFileSync(envFilePath, 'utf8');
  const vars = {};

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    vars[key] = value;
  }

  return vars;
}

const envFile = process.argv[2];

if (!envFile) {
  console.error('Usage: node scripts/verify-env.cjs <envfile>');
  process.exit(1);
}

const envFilePath = path.resolve(process.cwd(), envFile);

if (!fs.existsSync(envFilePath)) {
  console.error(`\n[verify-env] Env file not found: ${envFilePath}\n`);
  process.exit(1);
}

const vars = readEnvFile(envFilePath);
let passed = 0;
let failed = 0;

console.log(`\n[verify-env] Checking: ${envFile}`);
console.log('─'.repeat(52));

for (const varName of REQUIRED_VARS) {
  if (vars[varName] !== undefined && vars[varName] !== '') {
    console.log(`  OK  ${varName}`);
    passed++;
  } else {
    console.error(`  XX  ${varName}  MISSING or EMPTY`);
    failed++;
  }
}

console.log('─'.repeat(52));

if (failed > 0) {
  console.error(`\n[verify-env] Failed with ${failed} issue(s).\n`);
  process.exit(1);
}

console.log(`\n[verify-env] Passed. ${passed}/${REQUIRED_VARS.length} required variables present.\n`);
