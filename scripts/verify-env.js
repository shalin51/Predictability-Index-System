#!/usr/bin/env node
/**
 * verify-env.js
 * Validates that an env file exists and contains all required variables.
 *
 * Usage:
 *   node scripts/verify-env.js <envfile>
 *
 * Examples:
 *   node scripts/verify-env.js env.dev
 *   node scripts/verify-env.js env.staging
 */
'use strict';

const fs = require('fs');
const path = require('path');

const REQUIRED_VARS = [
  'APP_ENV',
  'NODE_ENV',
  'MAIN_SERVER_PORT',
  'DASHBOARD_PORT',
  'API_BASE_URL',
  'DASHBOARD_URL',
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

const envFile = process.argv[2];

if (!envFile) {
  console.error('Usage: node scripts/verify-env.js <envfile>');
  process.exit(1);
}

const envFilePath = path.resolve(process.cwd(), envFile);

if (!fs.existsSync(envFilePath)) {
  console.error(`\n[verify-env] ✗ Env file not found: ${envFilePath}\n`);
  process.exit(1);
}

const content = fs.readFileSync(envFilePath, 'utf8');
const vars = {};
let lineNum = 0;

for (const line of content.split('\n')) {
  lineNum++;
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIndex = trimmed.indexOf('=');
  if (eqIndex <= 0) {
    console.warn(`  Warning: Line ${lineNum} is not a valid KEY=VALUE pair: "${trimmed}"`);
    continue;
  }
  const key = trimmed.slice(0, eqIndex).trim();
  const value = trimmed.slice(eqIndex + 1).trim();
  vars[key] = value;
}

let passed = 0;
let failed = 0;
const issues = [];

console.log(`\n[verify-env] Checking: ${envFile}`);
console.log('─'.repeat(52));

// Check all required vars are present and non-empty
for (const varName of REQUIRED_VARS) {
  if (vars[varName] !== undefined && vars[varName] !== '') {
    console.log(`  ✓  ${varName}`);
    passed++;
  } else {
    console.error(`  ✗  ${varName}  ← MISSING or EMPTY`);
    issues.push(`Missing required variable: ${varName}`);
    failed++;
  }
}

// Production safety: SEED_RESET_DATABASE must not be true in production
if (vars['APP_ENV'] === 'production' && vars['SEED_RESET_DATABASE'] === 'true') {
  console.error(`  ✗  SEED_RESET_DATABASE=true is NOT allowed in production`);
  issues.push('SEED_RESET_DATABASE must not be true in production');
  failed++;
}

// Warn if non-dev env uses placeholder credentials
if (vars['APP_ENV'] && vars['APP_ENV'] !== 'dev') {
  for (const sensitiveKey of ['DB_PASSWORD', 'DATABASE_URL']) {
    if (vars[sensitiveKey]) {
      const isPlaceholder = PLACEHOLDER_VALUES.some((p) =>
        vars[sensitiveKey].toLowerCase().includes(p.toLowerCase())
      );
      if (isPlaceholder) {
        console.warn(`  ⚠  ${sensitiveKey} appears to use a placeholder value`);
      }
    }
  }
}

console.log('─'.repeat(52));

if (failed === 0) {
  console.log(`\n✅  ${envFile} passed. ${passed}/${REQUIRED_VARS.length} required variables present.\n`);
  process.exit(0);
} else {
  console.error(`\n❌  ${envFile} has ${failed} issue(s):`);
  for (const issue of issues) {
    console.error(`    - ${issue}`);
  }
  console.error('');
  process.exit(1);
}
