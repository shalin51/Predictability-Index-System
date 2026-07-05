#!/usr/bin/env node
'use strict';

const {
  assertStaticWebAppCanLinkFunctions,
  az,
  getEnvironmentConfig,
  getFunctionAppHost,
  run,
} = require('./azure-deploy-config.cjs');

const envName = process.argv[2];
const config = getEnvironmentConfig(envName);

function workspaceRun(workspace, script, env = {}) {
  run('npm', ['run', script, '--workspace', workspace], { env });
}

function linkFunctionApp() {
  const functionResourceId = az([
    'functionapp',
    'show',
    '--name',
    config.functionApp.name,
    '--resource-group',
    config.functionApp.resourceGroup,
    '--query',
    'id',
    '--output',
    'tsv',
  ], { capture: true });

  az([
    'staticwebapp',
    'functions',
    'link',
    '--name',
    config.staticWebApp.name,
    '--resource-group',
    config.staticWebApp.resourceGroup,
    '--function-resource-id',
    functionResourceId,
    '--force',
    '--output',
    'none',
  ]);
}

workspaceRun('@amfpi/main-server', `deploy:${envName}`);
const apiBaseUrl = `https://${getFunctionAppHost(config)}/api`;
workspaceRun('@amfpi/dashboard', `deploy:${envName}`, { VITE_API_BASE_URL: apiBaseUrl });

if (config.staticWebApp.useLinkedFunctionBackend) {
  assertStaticWebAppCanLinkFunctions(config);
  linkFunctionApp();
  console.log(`[deploy:${envName}] Deployed and linked ${config.staticWebApp.name} -> ${config.functionApp.name}`);
} else {
  console.log(`[deploy:${envName}] Deployed ${config.staticWebApp.name} using API ${apiBaseUrl}`);
}
