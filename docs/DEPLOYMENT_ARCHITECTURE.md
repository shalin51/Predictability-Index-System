# Deployment Architecture

## Summary
The application is deployed as a static frontend plus a serverless API.

- Frontend: Azure Static Web Apps.
- Backend: Azure Function App, Node.js runtime.
- Database: Azure Database for PostgreSQL Flexible Server.
- Auth to database: Microsoft Entra ID token auth.
- Secrets/config: direct Function App settings for staging today; Key Vault support is implemented but not required.

## Environments
| Environment | Frontend | Backend | Database | Auth |
|---|---|---|---|---|
| dev | Vite local server | Functions Core Tools local host | local PostgreSQL | password |
| staging | Azure Static Web Apps | Azure Function App | Azure PostgreSQL Flexible Server | Entra |
| production | Azure Static Web Apps | Azure Function App | Azure PostgreSQL Flexible Server | Entra |

## Staging Resources
| Resource | Value |
|---|---|
| Subscription | `12c9ea76-c96b-45dc-8710-a1ae210e8cc0` |
| Resource group | `rg-p3-dev` |
| Static Web App | `predictability-index-dev` |
| Static Web App URL | `https://icy-glacier-0a77b2310.7.azurestaticapps.net` |
| Function App | `func-p3-stage` |
| Function API URL | `https://func-p3-stage.azurewebsites.net/api` |
| PostgreSQL server | `psql-p3-dev.postgres.database.azure.com` |
| PostgreSQL database | `AMFPI-Staging` |
| PostgreSQL Entra role | `func-p3-stage` |

## Request Flow
1. User opens the Static Web App.
2. Dashboard JavaScript calls `https://func-p3-stage.azurewebsites.net/api`.
3. Azure Function receives the HTTP request through `main-server-api`.
4. Function loads app settings and initializes config.
5. Function uses `DefaultAzureCredential` to get a PostgreSQL Entra token.
6. `pg` connects to PostgreSQL using the Entra token as the password.
7. API returns JSON to the dashboard.

## Backend Runtime
The backend is registered as one catch-all Azure Functions HTTP trigger:

```text
main-server-api: [GET,POST,PUT,OPTIONS] /api/{*segments}
```

The Function dispatcher maps incoming paths to the existing controllers and services. Domain logic remains in the existing module/service/repository structure.

Important runtime files:
- `main-server/src/functions/index.ts`
- `main-server/src/runtime/dispatcher.ts`
- `main-server/src/runtime/routes.ts`
- `main-server/src/runtime/http-context.ts`
- `main-server/src/runtime/controllers.ts`

## Database Auth Modes
`main-server` supports two database auth modes.

Password mode:
```text
DB_AUTH_MODE=password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=AMFPI
DB_USER=postgres
DB_PASSWORD=<local password>
DB_SSL_MODE=disable
```

Entra mode:
```text
DB_AUTH_MODE=entra
DB_SSL_MODE=require
DB_HOST=psql-p3-dev.postgres.database.azure.com
DB_PORT=5432
DB_NAME=AMFPI-Staging
DB_USER=func-p3-stage
AZURE_POSTGRES_SCOPE=https://ossrdbms-aad.database.windows.net/.default
```

If `AZURE_KEY_VAULT_URL` is set, the app reads DB host/port/name/user from Key Vault secret names. If it is empty, the app uses direct app settings.

## Current Staging Network State
Staging PostgreSQL currently has a temporary all-public firewall rule:

```text
staging-temporary-public-access: 0.0.0.0 - 255.255.255.255
```

This is active only to keep staging SWA and Function testing unblocked.

Preferred replacements:
- Private endpoint plus VNet integration.
- NAT Gateway with stable outbound IP.
- App Service plan/VNet integration with a controlled outbound path.

## Key Vault Position
Key Vault integration exists in the backend, but staging currently skips it because Contributor access cannot assign Key Vault permissions.

Current staging uses non-secret DB connection metadata as Function App settings. There is no database password in staging because PostgreSQL uses Entra token auth.

## Production Guidance
Production should use:
- Function App managed identity as PostgreSQL principal.
- No user UPN as `DB_USER`.
- Restricted PostgreSQL networking.
- Key Vault only if proper secret read access can be assigned.
- Separate PostgreSQL database/server from staging.
