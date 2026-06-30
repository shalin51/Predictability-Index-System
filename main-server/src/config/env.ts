/**
 * env.ts — Environment configuration loader
 *
 * This module must be imported FIRST in index.ts.
 * It reads the appropriate env file from the main-server app root and populates process.env.
 * After import, the exported `config` object provides typed access to all settings.
 *
 * Env file resolution order:
 *   1. process.env.APP_ENV_FILE (explicit override, absolute or relative to CWD)
 *   2. Derived from process.env.APP_ENV: dev→.env.development, staging→.env.staging, production→.env.production
 *   3. Fallback: .env.development
 */

import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// __dirname resolves to src/config/ (tsx) or dist/config/ (compiled).
// Either way, 2 levels up reaches the app root.
const ENV_ROOT = path.resolve(__dirname, '../../');

function resolveEnvFileName(): string {
  const appEnv = process.env.APP_ENV ?? '';
  const envMap: Record<string, string> = {
    dev: '.env.development',
    development: '.env.development',
    staging: '.env.staging',
    production: '.env.production',
  };
  return envMap[appEnv] ?? '.env.development';
}

const targetFile = process.env.APP_ENV_FILE ?? resolveEnvFileName();
const envFilePath = path.isAbsolute(targetFile)
  ? targetFile
  : path.resolve(ENV_ROOT, targetFile);

if (fs.existsSync(envFilePath)) {
  const result = dotenv.config({ path: envFilePath, override: false });
  if (result.error) {
    console.warn(`[config] Warning: Failed to parse ${targetFile}:`, result.error.message);
  } else {
    console.log(`[config] Loaded ${path.basename(envFilePath)}`);
  }
} else {
  console.warn(`[config] Warning: ${envFilePath} not found. Falling back to process.env.`);
}

export const config = {
  appEnv: process.env.APP_ENV ?? 'dev',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.MAIN_SERVER_PORT ?? '4000', 10),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  logLevel: process.env.LOG_LEVEL ?? 'info',
  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    name: process.env.DB_NAME ?? 'AMFPI',
    user: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASSWORD ?? '',
    url: process.env.DATABASE_URL ?? '',
  },
};
