#!/usr/bin/env node
/**
 * load-env.js
 * Loads environment variables from a specified env file and spawns a command.
 *
 * Usage:
 *   node scripts/load-env.js <envfile> [command] [args...]
 *
 * Examples:
 *   node scripts/load-env.js env.dev tsx apps/main-server/src/database/verify-db.ts
 *   node scripts/load-env.js env.dev                        # prints loaded vars
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: node scripts/load-env.js <envfile> [command] [args...]');
  process.exit(1);
}

const [envFile, ...commandArgs] = args;
const envFilePath = path.resolve(process.cwd(), envFile);

if (!fs.existsSync(envFilePath)) {
  console.error(`[load-env] Error: Env file not found: ${envFilePath}`);
  process.exit(1);
}

// Parse env file (KEY=VALUE format, # comments ignored)
const content = fs.readFileSync(envFilePath, 'utf8');
const envVars = {};

for (const line of content.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIndex = trimmed.indexOf('=');
  if (eqIndex <= 0) continue;
  const key = trimmed.slice(0, eqIndex).trim();
  const value = trimmed.slice(eqIndex + 1).trim();
  if (key) {
    envVars[key] = value;
  }
}

// Merge: env file takes precedence over existing process.env
const mergedEnv = { ...process.env, ...envVars };

// Add node_modules/.bin to PATH so local tools (tsx, etc.) are accessible
const binPath = path.resolve(process.cwd(), 'node_modules', '.bin');
const pathSep = process.platform === 'win32' ? ';' : ':';
mergedEnv.PATH = `${binPath}${pathSep}${mergedEnv.PATH || ''}`;

if (commandArgs.length === 0) {
  console.log(`[load-env] Loaded ${Object.keys(envVars).length} variables from ${envFile}`);
  console.log(`[load-env] Keys: ${Object.keys(envVars).join(', ')}`);
  process.exit(0);
}

// Spawn the command with the loaded environment
const [cmd, ...cmdArgs] = commandArgs;
const result = spawnSync(cmd, cmdArgs, {
  env: mergedEnv,
  stdio: 'inherit',
  shell: true,
  cwd: process.cwd(),
});

process.exit(result.status ?? 0);
