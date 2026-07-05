#!/usr/bin/env node
'use strict';

const { spawnSync } = require('child_process');

const SUBSCRIPTION_ID = '12c9ea76-c96b-45dc-8710-a1ae210e8cc0';
const PROJECT_SECRET_PREFIX = 'predictability-index';
const AZURE_POSTGRES_SCOPE = 'https://ossrdbms-aad.database.windows.net/.default';

const ENVIRONMENTS = {
  stage: {
    name: 'stage',
    appEnv: 'staging',
    keyVault: {
      name: 'kv-p3-project-dev',
      url: 'https://kv-p3-project-dev.vault.azure.net/',
    },
    staticWebApp: {
      name: 'predictability-index-dev',
      resourceGroup: 'rg-p3-dev',
      useLinkedFunctionBackend: false,
    },
    functionApp: {
      name: 'func-p3-stage',
      resourceGroup: 'rg-p3-dev',
      createIfMissing: true,
      location: 'eastus',
      storageAccount: 'stp3stagefunc',
    },
  },
  prod: {
    name: 'prod',
    appEnv: 'production',
    keyVault: {
      name: 'c3-prod',
      url: 'https://c3-prod.vault.azure.net/',
    },
    staticWebApp: {
      name: 'predictability-index-prod',
      resourceGroup: 'rg-p3-prod',
      useLinkedFunctionBackend: false,
    },
    functionApp: {
      name: 'func-p3-prod',
      resourceGroup: 'rg-p3-prod',
      createIfMissing: true,
      location: 'eastus',
      storageAccount: 'stp3prodfunc',
    },
  },
};

const SECRET_NAMES = {
  swaDeploymentToken: `${PROJECT_SECRET_PREFIX}-swa-deployment-token`,
  dbHost: `${PROJECT_SECRET_PREFIX}-db-host`,
  dbPort: `${PROJECT_SECRET_PREFIX}-db-port`,
  dbName: `${PROJECT_SECRET_PREFIX}-db-name`,
  dbUser: `${PROJECT_SECRET_PREFIX}-db-user`,
};

function getEnvironmentConfig(envName) {
  const config = ENVIRONMENTS[envName];
  if (!config) {
    throw new Error(`Unknown deploy environment '${envName}'. Expected one of: ${Object.keys(ENVIRONMENTS).join(', ')}`);
  }
  return config;
}

function resolveExecutable(command) {
  return command;
}

function quoteShellArg(value) {
  const text = String(value);
  if (!/[\s"'&|<>^]/.test(text)) {
    return text;
  }
  return `"${text.replace(/"/g, '\\"')}"`;
}

function run(command, args, options = {}) {
  const useWindowsShell = process.platform === 'win32';
  const result = spawnSync(
    useWindowsShell
      ? [resolveExecutable(command), ...args.map(quoteShellArg)].join(' ')
      : resolveExecutable(command),
    useWindowsShell ? [] : args,
    {
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    shell: useWindowsShell,
    env: options.env ? { ...process.env, ...options.env } : process.env,
    cwd: options.cwd,
    encoding: 'utf8',
    }
  );

  if (result.status !== 0) {
    const stderr = result.stderr ? `\n${result.stderr.trim()}` : '';
    throw new Error(`Command failed: ${command} ${args.join(' ')}${stderr}`);
  }

  return options.capture ? (result.stdout || '').trim() : '';
}

function az(args, options = {}) {
  return run('az', [...args, '--subscription', SUBSCRIPTION_ID], options);
}

function getStaticWebAppHost(config) {
  return az([
    'staticwebapp',
    'show',
    '--name',
    config.staticWebApp.name,
    '--resource-group',
    config.staticWebApp.resourceGroup,
    '--query',
    'defaultHostname',
    '--output',
    'tsv',
  ], { capture: true });
}

function getStaticWebAppSku(config) {
  return az([
    'staticwebapp',
    'show',
    '--name',
    config.staticWebApp.name,
    '--resource-group',
    config.staticWebApp.resourceGroup,
    '--query',
    'sku.name',
    '--output',
    'tsv',
  ], { capture: true });
}

function getFunctionAppHost(config) {
  return az([
    'functionapp',
    'show',
    '--name',
    config.functionApp.name,
    '--resource-group',
    config.functionApp.resourceGroup,
    '--query',
    'defaultHostName',
    '--output',
    'tsv',
  ], { capture: true });
}

function assertStaticWebAppCanLinkFunctions(config) {
  const sku = getStaticWebAppSku(config);
  if (!['Standard', 'Dedicated'].includes(sku)) {
    throw new Error(
      `${config.staticWebApp.name} is on SWA SKU '${sku}'. Upgrade the existing SWA to Standard or Dedicated before linking ${config.functionApp.name}.`
    );
  }
}

module.exports = {
  AZURE_POSTGRES_SCOPE,
  SECRET_NAMES,
  SUBSCRIPTION_ID,
  assertStaticWebAppCanLinkFunctions,
  az,
  getEnvironmentConfig,
  getFunctionAppHost,
  getStaticWebAppHost,
  resolveExecutable,
  run,
};
