#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const yazl = require('yazl');
const {
  AZURE_POSTGRES_SCOPE,
  SECRET_NAMES,
  SUBSCRIPTION_ID,
  az,
  getEnvironmentConfig,
  getStaticWebAppHost,
  resolveExecutable,
  run,
} = require('../../scripts/azure-deploy-config.cjs');

const envName = process.argv[2];
const config = getEnvironmentConfig(envName);
const serverRoot = path.resolve(__dirname, '..');
const packageRoot = path.join(serverRoot, '.deploy', envName);
const packageZip = path.join(serverRoot, '.deploy', `${envName}-function.zip`);
const envFileByAppEnv = {
  staging: '.env.staging',
  production: '.env.production',
};

function readEnvFile(fileName) {
  const envPath = path.join(serverRoot, fileName);
  if (!fs.existsSync(envPath)) {
    return {};
  }

  return Object.fromEntries(
    fs
      .readFileSync(envPath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const separator = line.indexOf('=');
        return separator > 0
          ? [line.slice(0, separator).trim(), line.slice(separator + 1).trim()]
          : [line, ''];
      })
  );
}

function resourceExists(args) {
  const result = spawnSync(resolveExecutable('az'), [...args, '--subscription', SUBSCRIPTION_ID], {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  return result.status === 0 && Boolean((result.stdout || '').trim());
}

function ensureStorageAccount() {
  if (!config.functionApp.storageAccount) {
    return;
  }

  if (resourceExists([
    'storage',
    'account',
    'show',
    '--name',
    config.functionApp.storageAccount,
    '--resource-group',
    config.functionApp.resourceGroup,
    '--query',
    'name',
    '--output',
    'tsv',
  ])) {
    return;
  }

  az([
    'storage',
    'account',
    'create',
    '--name',
    config.functionApp.storageAccount,
    '--resource-group',
    config.functionApp.resourceGroup,
    '--location',
    config.functionApp.location,
    '--sku',
    'Standard_LRS',
    '--kind',
    'StorageV2',
    '--https-only',
    'true',
    '--min-tls-version',
    'TLS1_2',
    '--allow-blob-public-access',
    'false',
    '--output',
    'none',
  ]);
}

function ensureFunctionApp() {
  try {
    az([
      'functionapp',
      'show',
      '--name',
      config.functionApp.name,
      '--resource-group',
      config.functionApp.resourceGroup,
      '--query',
      'name',
      '--output',
      'tsv',
    ], { capture: true });
  } catch (error) {
    if (!config.functionApp.createIfMissing) {
      throw new Error(`Function App ${config.functionApp.name} does not exist in ${config.functionApp.resourceGroup}`);
    }

    ensureStorageAccount();

    az([
      'functionapp',
      'create',
      '--name',
      config.functionApp.name,
      '--resource-group',
      config.functionApp.resourceGroup,
      '--storage-account',
      config.functionApp.storageAccount,
      '--consumption-plan-location',
      config.functionApp.location,
      '--runtime',
      'node',
      '--runtime-version',
      '22',
      '--functions-version',
      '4',
      '--os-type',
      'Linux',
      '--assign-identity',
      '[system]',
      '--https-only',
      'true',
      '--output',
      'none',
    ]);
  }

  az([
    'functionapp',
    'identity',
    'assign',
    '--name',
    config.functionApp.name,
    '--resource-group',
    config.functionApp.resourceGroup,
    '--output',
    'none',
  ]);
}

function copyRecursive(source, target) {
  const stats = fs.statSync(source);
  if (stats.isDirectory()) {
    fs.mkdirSync(target, { recursive: true });
    for (const entry of fs.readdirSync(source)) {
      copyRecursive(path.join(source, entry), path.join(target, entry));
    }
    return;
  }

  fs.copyFileSync(source, target);
}

function addDirectoryToZip(zipFile, sourceDir, zipDir = '') {
  for (const entry of fs.readdirSync(sourceDir)) {
    const sourcePath = path.join(sourceDir, entry);
    const zipPath = zipDir ? `${zipDir}/${entry}` : entry;
    const stats = fs.statSync(sourcePath);

    if (stats.isDirectory()) {
      addDirectoryToZip(zipFile, sourcePath, zipPath);
    } else {
      zipFile.addFile(sourcePath, zipPath);
    }
  }
}

function createZip() {
  if (fs.existsSync(packageZip)) {
    fs.rmSync(packageZip, { force: true });
  }

  const zipFile = new yazl.ZipFile();
  addDirectoryToZip(zipFile, packageRoot);

  return new Promise((resolve, reject) => {
    zipFile.outputStream
      .pipe(fs.createWriteStream(packageZip))
      .on('close', resolve)
      .on('error', reject);
    zipFile.end();
  });
}

async function buildPackage() {
  run('npm', ['run', 'build'], { cwd: serverRoot });

  if (fs.existsSync(packageRoot)) {
    fs.rmSync(packageRoot, { recursive: true, force: true });
  }
  fs.mkdirSync(packageRoot, { recursive: true });

  copyRecursive(path.join(serverRoot, 'dist'), path.join(packageRoot, 'dist'));
  fs.copyFileSync(path.join(serverRoot, 'host.json'), path.join(packageRoot, 'host.json'));
  fs.copyFileSync(path.join(serverRoot, 'package.json'), path.join(packageRoot, 'package.json'));

  run('npm', ['install', '--omit=dev', '--workspaces=false'], { cwd: packageRoot });
  await createZip();
}

function applyAppSettings() {
  const host = getStaticWebAppHost(config);
  const envFileVars = readEnvFile(envFileByAppEnv[config.appEnv] ?? '');
  const useKeyVault = Boolean(envFileVars.AZURE_KEY_VAULT_URL || process.env.AZURE_KEY_VAULT_URL);
  const settings = [
    `APP_ENV=${config.appEnv}`,
    'NODE_ENV=production',
    'FUNCTIONS_WORKER_RUNTIME=node',
    'DB_AUTH_MODE=entra',
    `AZURE_POSTGRES_SCOPE=${AZURE_POSTGRES_SCOPE}`,
    'DB_SSL_MODE=require',
    `CORS_ORIGIN=https://${host}`,
    'SCM_DO_BUILD_DURING_DEPLOYMENT=false',
    'WEBSITE_RUN_FROM_PACKAGE=1',
  ];

  if (useKeyVault) {
    settings.push(
      `AZURE_KEY_VAULT_URL=${envFileVars.AZURE_KEY_VAULT_URL || config.keyVault.url}`,
      `KV_SECRET_DB_HOST=${envFileVars.KV_SECRET_DB_HOST || SECRET_NAMES.dbHost}`,
      `KV_SECRET_DB_PORT=${envFileVars.KV_SECRET_DB_PORT || SECRET_NAMES.dbPort}`,
      `KV_SECRET_DB_NAME=${envFileVars.KV_SECRET_DB_NAME || SECRET_NAMES.dbName}`,
      `KV_SECRET_DB_USER=${envFileVars.KV_SECRET_DB_USER || SECRET_NAMES.dbUser}`
    );
  } else {
    for (const name of ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER']) {
      if (!envFileVars[name]) {
        throw new Error(`${name} is required in ${envFileByAppEnv[config.appEnv]} when Key Vault is not used`);
      }
      settings.push(`${name}=${envFileVars[name]}`);
    }
  }

  az([
    'functionapp',
    'config',
    'appsettings',
    'set',
    '--name',
    config.functionApp.name,
    '--resource-group',
    config.functionApp.resourceGroup,
    '--settings',
    ...settings,
    '--output',
    'none',
  ]);
}

function deployZip() {
  az([
    'functionapp',
    'deployment',
    'source',
    'config-zip',
    '--name',
    config.functionApp.name,
    '--resource-group',
    config.functionApp.resourceGroup,
    '--src',
    packageZip,
    '--timeout',
    '600',
    '--output',
    'none',
  ]);
}

async function main() {
  ensureFunctionApp();
  applyAppSettings();
  await buildPackage();
  deployZip();
  console.log(`[main-server:deploy:${envName}] Deployed ${config.functionApp.name}`);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
