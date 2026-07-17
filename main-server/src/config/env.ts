import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential } from '@azure/identity';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

export type DatabaseAuthMode = 'password' | 'entra';
export type DatabaseSslMode = 'disable' | 'require';

interface KeyVaultSecretRefs {
  dbHost: string;
  dbPort: string;
  dbName: string;
  dbUser: string;
}

interface AppConfig {
  appEnv: string;
  nodeEnv: string;
  port: number;
  corsOrigin: string;
  logLevel: string;
  setupImports: {
    storageAccountUrl: string;
    storageConnectionString: string;
    storageContainer: string;
  };
  db: {
    authMode: DatabaseAuthMode;
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    url: string;
    sslMode: DatabaseSslMode;
    azurePostgresScope: string;
    keyVaultUrl: string;
    keyVaultSecretRefs: KeyVaultSecretRefs;
    poolMax: number;
    idleTimeoutMillis: number;
    connectionTimeoutMillis: number;
  };
}

const DEFAULT_AZURE_POSTGRES_SCOPE = 'https://ossrdbms-aad.database.windows.net/.default';

let loadLogged = false;
let initPromise: Promise<void> | null = null;
let initialized = false;

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

function parseIntegerEnv(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseAuthMode(value: string | undefined): DatabaseAuthMode {
  return value?.toLowerCase() === 'entra' ? 'entra' : 'password';
}

function parseSslMode(value: string | undefined): DatabaseSslMode {
  return value?.toLowerCase() === 'require' ? 'require' : 'disable';
}

function resolveEnvRoot(): string {
  let current = __dirname;

  while (current !== path.dirname(current)) {
    const packageJsonPath = path.join(current, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      return current;
    }
    current = path.dirname(current);
  }

  return path.resolve(__dirname, '../../');
}

const ENV_ROOT = resolveEnvRoot();

function loadEnvFile(): void {
  const targetFile = process.env.APP_ENV_FILE ?? resolveEnvFileName();
  const envFilePath = path.isAbsolute(targetFile)
    ? targetFile
    : path.resolve(ENV_ROOT, targetFile);

  if (fs.existsSync(envFilePath)) {
    const result = dotenv.config({ path: envFilePath, override: false });
    if (result.error) {
      console.warn(`[config] Warning: Failed to parse ${targetFile}: ${result.error.message}`);
    } else if (!loadLogged) {
      console.log(`[config] Loaded ${path.basename(envFilePath)}`);
      loadLogged = true;
    }
  } else {
    console.warn(`[config] Warning: ${envFilePath} not found. Falling back to process.env.`);
  }
}

function readProcessConfig(): AppConfig {
  return {
    appEnv: process.env.APP_ENV ?? 'dev',
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: parseIntegerEnv(process.env.MAIN_SERVER_PORT, 4000),
    corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    logLevel: process.env.LOG_LEVEL ?? 'info',
    setupImports: {
      storageAccountUrl: process.env.SETUP_IMPORT_STORAGE_ACCOUNT_URL ?? '',
      storageConnectionString: process.env.SETUP_IMPORT_STORAGE_CONNECTION_STRING ?? process.env.AzureWebJobsStorage ?? '',
      storageContainer: process.env.SETUP_IMPORT_STORAGE_CONTAINER ?? 'process-setup-imports',
    },
    db: {
      authMode: parseAuthMode(process.env.DB_AUTH_MODE),
      host: process.env.DB_HOST ?? 'localhost',
      port: parseIntegerEnv(process.env.DB_PORT, 5432),
      name: process.env.DB_NAME ?? 'AMFPI',
      user: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASSWORD ?? '',
      url: process.env.DATABASE_URL ?? '',
      sslMode: parseSslMode(process.env.DB_SSL_MODE),
      azurePostgresScope: process.env.AZURE_POSTGRES_SCOPE ?? DEFAULT_AZURE_POSTGRES_SCOPE,
      keyVaultUrl: process.env.AZURE_KEY_VAULT_URL ?? '',
      keyVaultSecretRefs: {
        dbHost: process.env.KV_SECRET_DB_HOST ?? '',
        dbPort: process.env.KV_SECRET_DB_PORT ?? '',
        dbName: process.env.KV_SECRET_DB_NAME ?? '',
        dbUser: process.env.KV_SECRET_DB_USER ?? '',
      },
      poolMax: parseIntegerEnv(process.env.DB_POOL_MAX, 10),
      idleTimeoutMillis: parseIntegerEnv(process.env.DB_POOL_IDLE_TIMEOUT_MS, 30_000),
      connectionTimeoutMillis: parseIntegerEnv(process.env.DB_POOL_CONNECTION_TIMEOUT_MS, 5_000),
    },
  };
}

function assignConfig(target: AppConfig, source: AppConfig): void {
  target.appEnv = source.appEnv;
  target.nodeEnv = source.nodeEnv;
  target.port = source.port;
  target.corsOrigin = source.corsOrigin;
  target.logLevel = source.logLevel;
  Object.assign(target.setupImports, source.setupImports);
  Object.assign(target.db, source.db);
}

function requireEnvValue(name: string, value: string): string {
  if (!value) {
    throw new Error(`[config] Missing required environment variable: ${name}`);
  }
  return value;
}

async function loadKeyVaultSecrets(): Promise<void> {
  const snapshot = readProcessConfig();

  if (snapshot.db.authMode !== 'entra') {
    return;
  }

  if (!snapshot.db.keyVaultUrl) {
    return;
  }

  const keyVaultUrl = snapshot.db.keyVaultUrl;
  const secretRefs = snapshot.db.keyVaultSecretRefs;
  const secretNames = {
    DB_HOST: requireEnvValue('KV_SECRET_DB_HOST', secretRefs.dbHost),
    DB_PORT: requireEnvValue('KV_SECRET_DB_PORT', secretRefs.dbPort),
    DB_NAME: requireEnvValue('KV_SECRET_DB_NAME', secretRefs.dbName),
    DB_USER: requireEnvValue('KV_SECRET_DB_USER', secretRefs.dbUser),
  };

  const credential = new DefaultAzureCredential();
  const client = new SecretClient(keyVaultUrl, credential);
  const entries = await Promise.all(
    Object.entries(secretNames).map(async ([envName, secretName]) => {
      const secret = await client.getSecret(secretName);
      const value = secret.value?.trim();
      if (!value) {
        throw new Error(`[config] Key Vault secret '${secretName}' for ${envName} is empty`);
      }
      return [envName, value] as const;
    })
  );

  for (const [envName, value] of entries) {
    process.env[envName] = value;
  }
}

loadEnvFile();

export const config: AppConfig = readProcessConfig();

export async function initializeConfig(): Promise<void> {
  if (initialized) {
    return;
  }

  if (!initPromise) {
    initPromise = (async () => {
      await loadKeyVaultSecrets();
      assignConfig(config, readProcessConfig());
      initialized = true;
      console.log(`[config] Initialised for APP_ENV=${config.appEnv} using DB auth mode=${config.db.authMode}`);
    })().catch((error: unknown) => {
      initPromise = null;
      throw error;
    });
  }

  await initPromise;
}
