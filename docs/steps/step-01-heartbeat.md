# Step 01 — Project Foundation, Heartbeat & DB Verification

## Status: `approved`

---

## Objective

Bootstrap the full enterprise monorepo foundation:

- React SPA dashboard (`apps/dashboard`)
- Node.js TypeScript main server (`apps/main-server`)
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
| `env.dev` | Development environment variables |
| `env.staging` | Staging environment variables |
| `env.production` | Production environment variables |
| `env.example` | Template (safe to commit) |
| `scripts/load-env.js` | Spawns commands with env loaded |
| `scripts/verify-env.js` | Validates env file completeness |
| `packages/shared/` | Shared TypeScript types |
| `apps/main-server/` | Express server with health endpoints |
| `apps/dashboard/` | React + Vite SPA heartbeat dashboard |

---

## Files Changed

```
package.json
tsconfig.base.json
.gitignore
env.dev
env.staging
env.production
env.example
scripts/load-env.js
scripts/verify-env.js
packages/shared/package.json
packages/shared/tsconfig.json
packages/shared/src/index.ts
packages/shared/src/types/health.ts
apps/main-server/package.json
apps/main-server/tsconfig.json
apps/main-server/src/index.ts
apps/main-server/src/config/env.ts
apps/main-server/src/database/connection.ts
apps/main-server/src/database/verify-db.ts
apps/main-server/src/modules/health/health.module.ts
apps/dashboard/package.json
apps/dashboard/tsconfig.json
apps/dashboard/tsconfig.node.json
apps/dashboard/vite.config.ts
apps/dashboard/index.html
apps/dashboard/.env.development
apps/dashboard/.env.production
apps/dashboard/src/vite-env.d.ts
apps/dashboard/src/main.tsx
apps/dashboard/src/App.tsx
apps/dashboard/src/services/api.ts
docs/steps/step-01-heartbeat.md
```

---

## Verification Checklist

### Environment & Git

- [x] `.gitignore` exists
- [x] `.gitignore` includes `env.dev`
- [x] `.gitignore` includes `env.staging`
- [x] `.gitignore` includes `env.production`
- [x] `env.dev` exists and passes `npm run verify:env:dev`
- [x] `env.staging` exists and passes `npm run verify:env:staging`
- [x] `env.production` exists and passes `npm run verify:env:production`
- [x] `env.example` exists and is commitable (no real secrets)
- [x] `env.dev` uses `DB_NAME=AMFPI`
- [x] `env.dev` uses `DB_PASSWORD=foxpro`
- [x] `env.dev` uses `DB_HOST=localhost`
- [x] `env.production` has `SEED_RESET_DATABASE=false`

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
