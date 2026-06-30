#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const REQUIRED_VARS = [
  'APP_ENV',
  'NODE_ENV',
  'MAIN_SERVER_PORT',
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'DATABASE_URL',
  'LOG_LEVEL',
  'CORS_ORIGIN',
];

const PLACEHOLDER_VALUES = ['CHANGE_ME', 'your-password', 'secret', 'placeholder'];

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

if (vars.APP_ENV === 'production' && vars.SEED_RESET_DATABASE === 'true') {
  console.error('  XX  SEED_RESET_DATABASE=true is not allowed in production');
  failed++;
}

if (vars.APP_ENV && vars.APP_ENV !== 'dev') {
  for (const sensitiveKey of ['DB_PASSWORD', 'DATABASE_URL']) {
    const value = vars[sensitiveKey];
    if (!value) {
      continue;
    }

    const isPlaceholder = PLACEHOLDER_VALUES.some((placeholder) =>
      value.toLowerCase().includes(placeholder.toLowerCase())
    );

    if (isPlaceholder) {
      console.warn(`  !!  ${sensitiveKey} appears to use a placeholder value`);
    }
  }
}

console.log('─'.repeat(52));

if (failed > 0) {
  console.error(`\n[verify-env] Failed with ${failed} issue(s).\n`);
  process.exit(1);
}

console.log(`\n[verify-env] Passed. ${passed}/${REQUIRED_VARS.length} required variables present.\n`);
