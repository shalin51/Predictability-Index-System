# Step 04 — Formulation CRUD + Audit Trail

## Status: `approved`

## Objective

Deliver end-to-end formulation create, list, detail, and edit workflows with audit logging and contract validation.

## Subagents

| Agent | Role |
|---|---|
| API Agent | Validates POST/GET/GET by id/PUT contracts |
| Dashboard Form Agent | Builds list, create, detail, and edit views |
| Audit Agent | Verifies create/update audit records |
| Validator Agent | Runs workflow and contract checks |

## Inputs

- Approved Steps 01-03
- Seeded formulation data
- Shared formulation DTO contracts

## Outputs

| File / Artefact | Description |
|---|---|
| `main-server/src/app.ts` | Testable Express app factory |
| `main-server/src/modules/formulations/__tests__/formulation.api.test.ts` | Formulation API contract tests |
| `dashboard/src/features/formulations/*` | CRUD dashboard views and reusable form |
| `docs/steps/step-04-formulation-crud.md` | Step validator artifact |

## Files Changed

```text
main-server/package.json
main-server/src/app.ts
main-server/src/index.ts
main-server/src/modules/formulations/formulation.service.ts
main-server/src/modules/formulations/__tests__/formulation.api.test.ts
dashboard/src/App.tsx
dashboard/src/services/api.ts
dashboard/src/features/formulations/FormulationListPage.tsx
dashboard/src/features/formulations/FormulationForm.tsx
dashboard/src/features/formulations/FormulationDetailPage.tsx
dashboard/src/features/formulations/FormulationEditorPage.tsx
docs/steps/step-04-formulation-crud.md
```

## Verification Checklist

- [x] `POST /formulations` creates a formulation
- [x] `GET /formulations` returns paginated data
- [x] `GET /formulations/:id` returns detail with materials
- [x] `PUT /formulations/:id` updates the formulation
- [x] Invalid create payloads are rejected
- [x] Empty update payloads are rejected
- [x] Create mutations write audit log entries
- [x] Update mutations write audit log entries
- [x] Dashboard has list, create, detail, and edit flows
- [x] Dashboard handles loading, error, and empty states across the formulation workflow

## Validator Result

```text
Status: APPROVED
Validated by: Validator Agent (manual + automated)
Timestamp: 2026-06-22
```

## Open Issues

- Analysis view remains separate from the CRUD detail flow and is not yet linked from the formulation detail page.

## Approval Status

```text
APPROVED — ready to proceed to Step 05
```
