# Deployment Runbook

## Current Staging State
Staging is deployed and tested.

Working endpoints:
```text
https://icy-glacier-0a77b2310.7.azurestaticapps.net
https://func-p3-stage.azurewebsites.net/api/health
https://func-p3-stage.azurewebsites.net/api/health/db
https://func-p3-stage.azurewebsites.net/api/health
```

Current state:
```text
https://func-p3-stage.azurewebsites.net/api/health -> 200
https://func-p3-stage.azurewebsites.net/api/health/db -> 200
https://func-p3-stage.azurewebsites.net/api/health -> 200
```

Staging Function App uses:
```text
APP_ENV=staging
NODE_ENV=production
DB_AUTH_MODE=entra
DB_SSL_MODE=require
DB_HOST=psql-p3-dev.postgres.database.azure.com
DB_PORT=5432
DB_NAME=AMFPI-Staging
DB_USER=func-p3-stage
AZURE_POSTGRES_SCOPE=https://ossrdbms-aad.database.windows.net/.default
```

## Local Staging Test
Run backend build:
```powershell
npm run build --workspace @amfpi/main-server
```

Test staging DB with Entra from local machine:
```powershell
$env:APP_ENV='staging'
node -e "(async () => { const { initializeConfig, config } = require('./main-server/dist/main-server/src/config/env.js'); const { testConnection, closePool } = require('./main-server/dist/main-server/src/infrastructure/database/pg-pool.js'); await initializeConfig(); const result = await testConnection(); console.log(JSON.stringify({ appEnv: config.appEnv, authMode: config.db.authMode, host: config.db.host, database: config.db.name, user: config.db.user, result }, null, 2)); await closePool(); })().catch((error) => { console.error(error); process.exit(1); });"
```

Expected:
```json
{
  "appEnv": "staging",
  "authMode": "entra",
  "result": {
    "connected": true
  }
}
```

Run Function host locally against staging:
```powershell
$env:APP_ENV='staging'
npm run start:functions --workspace @amfpi/main-server
```

Test local Function:
```powershell
Invoke-WebRequest http://localhost:7071/api/health
Invoke-WebRequest http://localhost:7071/api/health/db
```

## Deploy Staging Backend
```powershell
npm run deploy:stage --workspace @amfpi/main-server
```

This deploys `func-p3-stage` and applies app settings from `main-server/.env.staging` when Key Vault is not configured.

Verify:
```powershell
Invoke-WebRequest https://func-p3-stage.azurewebsites.net/api/health
Invoke-WebRequest https://func-p3-stage.azurewebsites.net/api/health/db
Invoke-WebRequest "https://func-p3-stage.azurewebsites.net/api/health"
```

## Deploy Staging Frontend
```powershell
$env:VITE_API_BASE_URL='https://func-p3-stage.azurewebsites.net/api'
npm run deploy:stage --workspace @amfpi/dashboard
```

Verify the deployed bundle points to the Function API:
```powershell
$html = (Invoke-WebRequest -Uri 'https://icy-glacier-0a77b2310.7.azurestaticapps.net').Content
$asset = [regex]::Match($html, 'src="([^"]+\.js)"').Groups[1].Value
$jsUrl = 'https://icy-glacier-0a77b2310.7.azurestaticapps.net' + $asset
$js = (Invoke-WebRequest -Uri $jsUrl).Content
$js.Contains('https://func-p3-stage.azurewebsites.net/api')
```

Expected:
```text
True
```

## PostgreSQL Entra Principal Setup
Create the Function App managed identity role:
```sql
select * from pgaadauth_create_principal('func-p3-stage', false, false);
```

Grant access:
```sql
GRANT CONNECT ON DATABASE "AMFPI-Staging" TO "func-p3-stage";
GRANT USAGE ON SCHEMA public TO "func-p3-stage";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "func-p3-stage";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "func-p3-stage";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "func-p3-stage";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO "func-p3-stage";
```

## Staging Firewall
The broad temporary public rule is currently active:
```text
staging-temporary-public-access: 0.0.0.0 - 255.255.255.255
```

This is not a production-grade network design. Use private networking or a controlled outbound NAT path before production.

Remove it after a safer networking path is configured:
```powershell
az postgres flexible-server firewall-rule delete `
  --server-name psql-p3-dev `
  --resource-group rg-p3-dev `
  --subscription 12c9ea76-c96b-45dc-8710-a1ae210e8cc0 `
  --name staging-temporary-public-access `
  --yes
```

## Common Failures
`Connection terminated due to connection timeout`:
PostgreSQL firewall or networking is blocking the Function App.

`Microsoft Entra user token for role ... is neither an AAD_AUTH_TOKENTYPE_APP_USER or an AAD_AUTH_TOKENTYPE_APP_OBO token`:
The Function App is trying to connect as a user UPN. Use the Function managed identity role, such as `func-p3-stage`.

`/api/health` returns `500` immediately:
Function App settings may still point to Key Vault without permission. Remove `AZURE_KEY_VAULT_URL` or grant Key Vault secret read access.

SWA loads but API calls fail:
Confirm the dashboard bundle contains `https://func-p3-stage.azurewebsites.net/api`, or link SWA to Functions on a paid SWA SKU.
