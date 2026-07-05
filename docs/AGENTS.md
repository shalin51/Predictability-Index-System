# Agent Instructions

## Operating Rules
- Be terse.
- Output only what is needed to complete the task.
- Do not revert user changes unless explicitly asked.
- Do not store secrets in source control.
- Keep code modular and scoped to the requested change.
- Prefer existing project patterns over new abstractions.
- Use `rg` for search when available.
- Use `apply_patch` for manual edits.
- Close or stop any terminals, background jobs, local servers, or Function hosts started for a task.

## Repository Shape
- `dashboard/`: React + Vite frontend hosted in Azure Static Web Apps for staging/prod.
- `main-server/`: Node/TypeScript backend hosted as Azure Functions for staging/prod.
- `packages/shared/`: shared DTOs, constants, and contracts.
- `scripts/`: root Azure deployment helpers.

## Current Hosting Model
- Local dev uses local Vite and the local Express server.
- Staging SWA calls the deployed staging Function App directly.
- Staging Function App connects to Azure PostgreSQL with Microsoft Entra auth.
- Key Vault support exists in code, but staging currently uses direct Function App settings because Key Vault access assignment is not available.

## Important Files
- `DEPLOYMENT_ARCHITECTURE.md`: Azure resource and data-flow architecture.
- `DEPLOYMENT_RUNBOOK.md`: staging deployment, verification, and rollback steps.
- `main-server/.env.staging`: local staging test config. Do not commit secrets.
- `dashboard/.env.staging`: dashboard staging build defaults.
- `scripts/azure-deploy-config.cjs`: Azure resource names and deployment constants.
- `main-server/scripts/deploy-function.cjs`: Function App package and app settings deployment.
- `dashboard/scripts/deploy-swa.cjs`: Static Web Apps deployment.

## Verification Commands
```powershell
npm run verify:env:staging --workspace @amfpi/main-server
npm run build --workspace @amfpi/main-server
npm run build --workspace @amfpi/dashboard
```

Use these for deployed staging checks:
```powershell
Invoke-WebRequest https://func-p3-stage.azurewebsites.net/api/health
Invoke-WebRequest https://func-p3-stage.azurewebsites.net/api/health/db
Invoke-WebRequest "https://func-p3-stage.azurewebsites.net/api/health"
```

## Current Staging Status
- SWA: `https://icy-glacier-0a77b2310.7.azurestaticapps.net`
- Function API: `https://func-p3-stage.azurewebsites.net/api`
- PostgreSQL: `psql-p3-dev.postgres.database.azure.com`
- Database: `AMFPI-Staging`
- Function DB principal: `func-p3-stage`
- PostgreSQL has a temporary all-public staging firewall rule so SWA/Function can read the database.

## Do Not Break
- Local `dev` must continue to work with `.env.development` and password auth.
- Existing backend API contracts must remain compatible with the dashboard.
- Browser code must never access PostgreSQL, Entra DB tokens, or Key Vault directly.
- Production must not use staging's temporary all-public firewall model.
