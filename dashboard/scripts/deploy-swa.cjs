#!/usr/bin/env node
'use strict';

const path = require('path');
const {
  SECRET_NAMES,
  az,
  getEnvironmentConfig,
  getFunctionAppHost,
  run,
} = require('../../scripts/azure-deploy-config.cjs');

const envName = process.argv[2];
const config = getEnvironmentConfig(envName);
const dashboardRoot = path.resolve(__dirname, '..');

function getApiBaseUrl() {
  if (process.env.VITE_API_BASE_URL) {
    return process.env.VITE_API_BASE_URL;
  }

  if (config.staticWebApp.useLinkedFunctionBackend) {
    return '/api';
  }

  return `https://${getFunctionAppHost(config)}/api`;
}

function getDeploymentToken() {
  try {
    return az([
      'keyvault',
      'secret',
      'show',
      '--vault-name',
      config.keyVault.name,
      '--name',
      SECRET_NAMES.swaDeploymentToken,
      '--query',
      'value',
      '--output',
      'tsv',
    ], { capture: true });
  } catch {
    console.warn(`[dashboard:deploy:${envName}] Key Vault token unavailable; using SWA deployment token from ${config.staticWebApp.name}`);
    return az([
      'staticwebapp',
      'secrets',
      'list',
      '--name',
      config.staticWebApp.name,
      '--resource-group',
      config.staticWebApp.resourceGroup,
      '--query',
      'properties.apiKey',
      '--output',
      'tsv',
    ], { capture: true });
  }
}

const token = getDeploymentToken();
const apiBaseUrl = getApiBaseUrl();

run('npm', ['run', 'build'], {
  cwd: dashboardRoot,
  env: {
    VITE_API_BASE_URL: apiBaseUrl,
    VITE_APP_ENV: config.appEnv,
  },
});

run('npx', [
  '-y',
  '@azure/static-web-apps-cli',
  'deploy',
  './dist',
  '--deployment-token',
  token,
  '--env',
  'production',
], {
  cwd: dashboardRoot,
});

console.log(`[dashboard:deploy:${envName}] Deployed ${config.staticWebApp.name}`);
