# Step 03 — Database Schema Foundation

## Status: `approved`

## Objective

Create and validate the centralized formulation database schema, seed data, and repository access layer.

## Subagents

| Agent | Role |
|---|---|
| DB Schema Agent | Owns tables, constraints, indexes, and reset safety |
| Domain Model Agent | Keeps repository mappings aligned to shared contracts |
| Migration/Seed Agent | Makes migrate/reset/seed flows repeatable |
| Validator Agent | Verifies schema, seeds, and repository behavior |

## Inputs

- Step 02 architecture baseline
- PostgreSQL database `AMFPI`
- Existing migration and seed SQL

## Outputs

| File / Artefact | Description |
|---|---|
| `main-server/src/database/migration-runner.ts` | Reusable reset/migrate/seed orchestration |
| `main-server/src/database/validate-schema.ts` | Schema validator gate |
| `main-server/src/infrastructure/repositories/__tests__/repository.integration.test.ts` | Repository integration coverage |
| `docs/steps/step-03-database-foundation.md` | Step validator artifact |

## Files Changed

```text
package.json
main-server/src/database/migration-runner.ts
main-server/src/database/migrate.ts
main-server/src/database/validate-schema.ts
main-server/src/database/seeds/001_benchmark_profiles.sql
main-server/src/database/seeds/002_sample_formulations.sql
main-server/src/infrastructure/repositories/__tests__/repository.integration.test.ts
docs/steps/step-03-database-foundation.md
```

## Verification Checklist

- [x] Schema covers formulations, materials, composition, processing, test, durability, environmental, subjective, benchmark, and audit data
- [x] Foreign keys exist for formulation and benchmark relationships
- [x] Indexes exist for `formulation_id`, `produced_date`, and `benchmark_id`
- [x] `db:fresh:dev` reset path drops later-migration objects safely
- [x] Seed flow is repeatable for benchmark and sample formulation data
- [x] `npm run db:validate:schema:dev` passes
- [x] Repository integration tests pass
- [x] Dashboard continues consuming mapped DTOs instead of raw DB shape

## Validator Result

```text
Status: APPROVED
Validated by: Validator Agent (manual + automated)
Timestamp: 2026-06-22
```

## Open Issues

- Seed data remains sample-only and should stay out of production execution paths.

## Approval Status

```text
APPROVED — ready to proceed to Step 04
```
