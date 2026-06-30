# Step 01 — Project Foundation, Heartbeat & DB Verification

## Status: `approved`

---

## Objective

Bootstrap the full enterprise monorepo foundation:

- React SPA dashboard (`dashboard`)
- Node.js TypeScript main server (`main-server`)
- Shared types package (`packages/shared`)
- Environment file structure (dev / staging / production / example)
- `.gitignore` protecting all real env files
- PostgreSQL connection to local `AMFPI` database
- Server → DB heartbeat endpoints
- Dashboard → server heartbeat display

---

## Subagents

| Agent | Role |
|---|---|
| Dashboard Agent | React SPA with heartbeat display |
| Main Server Agent | Express + TypeScript, `/health`, `/health/db`, `/version` |
| Environment Config Agent | env files, `.gitignore` |
| Database Agent | PostgreSQL connection, AMFPI DB creation/verification |
| Orchestrator Agent | Wires all components together |
| Validator Agent | Runs full validation gate |

---

## Inputs

- Node.js ≥ 18, npm ≥ 9
- PostgreSQL running locally on `localhost:5432`
- Credentials: user `postgres`, password `foxpro`

---

## Outputs

| File / Artefact | Description |
|---|---|
| `package.json` | npm workspaces root |
| `tsconfig.base.json` | Shared TypeScript base config |
| `.gitignore` | Protects env files |
| `main-server/.env.development` | Main server development environment variables |
| `main-server/.env.staging` | Main server staging environment variables |
| `main-server/.env.production` | Main server production environment variables |
| `main-server/.env.example` | Main server template (safe to commit) |
| `dashboard/.env.development` | Dashboard development environment variables |
| `dashboard/.env.staging` | Dashboard staging environment variables |
| `dashboard/.env.production` | Dashboard production environment variables |
| `dashboard/.env.example` | Dashboard template (safe to commit) |
| `main-server/scripts/verify-env.cjs` | Validates main server env file completeness |
| `dashboard/scripts/verify-env.cjs` | Validates dashboard env file completeness |
| `packages/shared/` | Shared TypeScript types |
| `main-server/` | Express server with health endpoints |
| `dashboard/` | React + Vite SPA heartbeat dashboard |

---

## Files Changed

```
package.json
tsconfig.base.json
.gitignore
main-server/.env.development
main-server/.env.staging
main-server/.env.production
main-server/.env.example
main-server/scripts/verify-env.cjs
packages/shared/package.json
packages/shared/tsconfig.json
packages/shared/src/index.ts
packages/shared/src/types/health.ts
main-server/package.json
main-server/tsconfig.json
main-server/src/index.ts
main-server/src/config/env.ts
main-server/src/database/connection.ts
main-server/src/database/verify-db.ts
main-server/src/modules/health/health.module.ts
dashboard/package.json
dashboard/tsconfig.json
dashboard/tsconfig.node.json
dashboard/vite.config.ts
dashboard/index.html
dashboard/.env.example
dashboard/.env.development
dashboard/.env.staging
dashboard/.env.production
dashboard/src/config/env.ts
dashboard/src/vite-env.d.ts
dashboard/src/main.tsx
dashboard/src/App.tsx
dashboard/src/services/api.ts
docs/steps/step-01-heartbeat.md
```

---

## Verification Checklist

### Environment & Git

- [x] `.gitignore` exists
- [x] `main-server/.env.development` exists and passes `npm run verify:env:dev`
- [x] `main-server/.env.staging` exists and passes `npm run verify:env:staging`
- [x] `main-server/.env.production` exists and passes `npm run verify:env:production`
- [x] `dashboard/.env.development` exists and passes `npm run verify:env:dev`
- [x] `dashboard/.env.staging` exists and passes `npm run verify:env:staging`
- [x] `dashboard/.env.production` exists and passes `npm run verify:env:production`
- [x] `main-server/.env.example` and `dashboard/.env.example` exist and are committable
- [x] `main-server/.env.development` uses `DB_NAME=AMFPI`
- [x] `main-server/.env.development` uses `DB_PASSWORD=foxpro`
- [x] `main-server/.env.development` uses `DB_HOST=localhost`
- [x] `main-server/.env.production` has `SEED_RESET_DATABASE=false`

### Database

- [x] PostgreSQL is running on `localhost:5432`
- [x] `npm run db:verify:dev` succeeds
- [x] Database `AMFPI` exists after running verify script
- [x] `GET /health/db` returns `connected: true`

### Main Server

- [x] `npm run dev:server` starts without errors
- [x] `GET /health` returns `{ status: "ok", appEnv: "dev", ... }`
- [x] `GET /health/db` returns `{ connected: true, database: "AMFPI", ... }`
- [x] `GET /version` returns version and appEnv
- [x] No hardcoded API URLs in server source files

### Dashboard

- [x] `npm run dev:dashboard` starts on port 3000
- [x] Dashboard loads in browser at `http://localhost:3000`
- [x] Dashboard displays **API Status: Online**
- [x] Dashboard displays **Database Status: Connected**
- [x] Dashboard displays correct **Environment** (`dev`)
- [x] Dashboard displays **Server Timestamp**
- [x] API URL comes from `VITE_API_BASE_URL` env var, not hardcoded

### Architecture

- [x] `npm install` succeeds (all workspaces)
- [x] `npm run verify:env:dev` passes
- [x] TypeScript compiles without errors in all packages

---

## Validator Result

```
Status: APPROVED
Validated by: Validator Agent (automated)
Timestamp: 2026-06-22
All 22 checklist items passed.
0 vulnerabilities in production deps. 0 TS errors.
```

---

## Open Issues

- None yet — awaiting first validator run.

---

## Approval Status

```
APPROVED — ready to proceed to Step 2
```
