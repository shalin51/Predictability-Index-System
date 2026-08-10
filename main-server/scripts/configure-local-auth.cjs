#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const envFile = process.argv[2] || '.env.development';
const envPath = path.resolve(process.cwd(), envFile);

if (!fs.existsSync(envPath)) {
  throw new Error(`Environment file not found: ${envPath}`);
}

const content = fs.readFileSync(envPath, 'utf8');
const configuredNames = new Set(
  content
    .split(/\r?\n/)
    .map((line) => line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.+)$/)?.[1])
    .filter(Boolean)
);
const additions = [];

for (const name of ['JWT_SECRET', 'APP_API_KEY']) {
  if (!configuredNames.has(name)) {
    additions.push(`${name}=${crypto.randomBytes(48).toString('base64url')}`);
  }
}

if (additions.length > 0) {
  const separator = content.endsWith('\n') ? '' : '\n';
  fs.appendFileSync(envPath, `${separator}${additions.join('\n')}\n`, 'utf8');
}

console.log(`[configure-local-auth] ${envFile} is configured.`);
