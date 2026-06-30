# Step 02 — Enterprise Architecture Skeleton

## Status: `approved`

## Objective

Establish clean cross-app architecture boundaries before expanding feature work.

## Subagents

| Agent | Role |
|---|---|
| Architecture Agent | Defines folder boundaries and cross-layer rules |
| Shared Package Agent | Centralizes DTO and contract ownership |
| Server Structure Agent | Preserves controller/service/repository separation |
| Validator Agent | Verifies boundaries, TypeScript strictness, and build health |

## Inputs

- Existing Step 01 workspace
- Root/workspace TypeScript configs
- Shared package contract exports

## Outputs

| File / Artefact | Description |
|---|---|
| `docs/architecture/step-02-architecture-rules.md` | Architecture and boundary rules |
| `docs/steps/step-02-architecture.md` | Step validator artifact |
| `apps/dashboard/src/services/api.ts` | Shared-contract API typing only |
| `package.json` | Root validation/build scripts aligned to step flow |

## Files Changed

```text
package.json
apps/dashboard/src/services/api.ts
apps/main-server/src/modules/reports/report.service.ts
apps/main-server/src/modules/scoring/scoring-engine.ts
docs/architecture/step-02-architecture-rules.md
docs/steps/step-02-architecture.md
```

## Verification Checklist

- [x] Required server folders exist: `modules`, `core`, `infrastructure`, `middlewares`, `errors`, `config`
- [x] Required dashboard folders exist: `components`, `features`, `services`, `types`, `theme`
- [x] Shared package contains `types`, `contracts`, `constants`
- [x] No business logic moved into controllers during this step
- [x] Dashboard API DTOs come from `@amfpi/shared`
- [x] No duplicated API DTO definitions remain in dashboard service layer
- [x] TypeScript strict mode is enabled
- [x] `npm run build` passes
- [x] `npm run type-check` passes
- [x] `npm run lint` passes
- [x] `npm test` passes
- [x] Architecture rules are documented

## Validator Result

```text
Status: APPROVED
Validated by: Validator Agent (manual + automated)
Timestamp: 2026-06-22
```

## Open Issues

- `src/interfaces` and `packages/shared/src/validators` are reserved but not populated yet.

## Approval Status

```text
APPROVED — ready to proceed to Step 03
```
