# Step 11 — Centralized Formulation Database Expansion

## Status: `proposed`

## Objective

Close the gap between the current formulation platform and the required centralized formulation database for formulation, manufacturing, test, environmental, durability, and subjective data.

## Current Coverage

Supported now:

- Formulation identity: `formulation_code`, `produced_date`, `lot_number`, `batch_size_kg`
- Composition storage: `formulation_materials.percentage`, `formulation_materials.lot_number`
- Physical/performance results
- Durability numeric results
- Environmental numeric scores
- Subjective numeric scores

Missing or partial now:

- No API/UI for processing/manufacturing runs
- No formulation-level supplier capture per component
- No exact fields for `mold used`, `injection pressure`, `cycle time`
- No dedicated `player feedback`
- No dedicated `crack propagation observations`
- No dedicated environmental result text fields
- No formulation create/edit flow for composition or manufacturing data

## Requirement Mapping

| Requirement | Current State | Delta |
|---|---|---|
| Formulation ID | Supported | None |
| Date produced | Supported | None |
| Resin components | Partial | Add create/edit API + UI for `materials[]` |
| Percent composition | Supported in DB only | Add create/edit API + UI |
| Material suppliers | Partial | Add `supplier_id` to `formulation_materials` and expose in DTOs |
| Lot numbers | Partial | Formulation + material lot exist; expose material lot in editor |
| Processing parameters | Partial | Expose `processing_runs` via API/UI |
| Mold used | Missing | Add column |
| Injection pressure | Missing | Add column |
| Melt temperature | Partial | Map existing `melt_temp_c` |
| Cooling time | Partial | Map existing `cooling_time_s` |
| Cycle time | Missing | Add column |
| Machine used | Partial | Map existing `machine_id` or rename in DTO |
| Physical properties | Supported | None |
| Performance testing | Supported | None |
| Durability testing | Partial | Add `crack_propagation_observations` |
| Environmental testing | Partial | Add dedicated text result fields |
| Subjective ratings | Partial | Add `player_feedback` |

## Schema Delta

### Migration

Add a new migration:

```text
apps/main-server/src/database/migrations/003_centralized_formulation_expansion.sql
```

### Table Changes

`formulation_materials`

- Add `supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL`
- Backfill from `materials.supplier_id`

`processing_runs`

- Add `mold_used TEXT`
- Add `injection_pressure NUMERIC(10,2)`
- Add `cycle_time_s NUMERIC(8,2)`

Keep and reuse existing columns:

- `melt_temp_c`
- `cooling_time_s`
- `machine_id`
- `notes`

`durability_results`

- Add `crack_propagation_observations TEXT`

`environmental_results`

- Add `hot_temperature_performance TEXT`
- Add `cold_temperature_performance TEXT`
- Add `humidity_exposure_results TEXT`

Keep existing numeric scoring fields for analysis:

- `hot_performance_score`
- `cold_performance_score`
- `humidity_performance_score`

`subjective_ratings`

- Add `player_feedback TEXT`

### Indexes

Add:

- `idx_formulation_materials_supplier` on `formulation_materials(supplier_id)`
- `idx_processing_runs_formulation_run_date` on `processing_runs(formulation_id, run_date DESC)`

## Shared Contract Delta

Update:

```text
packages/shared/src/types/domain.ts
packages/shared/src/contracts/domain.contract.ts
```

### New / Expanded Types

Add:

- `ProcessingRun`
- `CreateProcessingRunDto`
- `UpdateProcessingRunDto`
- `FormulationMaterialInputDto`

Expand `FormulationDetailDto.materials[]` to include:

- `supplierId?: string`
- `supplierName?: string`
- `notes?: string`

Expand `CreateFormulationDto` and `UpdateFormulationDto`:

- `materials?: FormulationMaterialInputDto[]`
- `processingRun?: CreateProcessingRunDto | UpdateProcessingRunDto`

Expand `DurabilityResult` and `UpsertDurabilityDto`:

- `crackPropagationObservations?: string`

Expand `EnvironmentalResult` and `UpsertEnvironmentalDto`:

- `hotTemperaturePerformance?: string`
- `coldTemperaturePerformance?: string`
- `humidityExposureResults?: string`

Expand `SubjectiveRating` and `UpsertSubjectiveRatingDto`:

- `playerFeedback?: string`

Suggested `ProcessingRun` shape:

```ts
interface ProcessingRun {
  id: string;
  formulationId: string;
  runDate: string;
  moldUsed?: string;
  injectionPressure?: number;
  meltTempC?: number;
  coolingTimeS?: number;
  cycleTimeS?: number;
  machineUsed?: string;
  notes?: string;
  createdAt: string;
}
```

## API Delta

### Existing Formulation API

Update:

```text
apps/main-server/src/modules/formulations/formulation.service.ts
apps/main-server/src/infrastructure/repositories/formulation.repository.ts
apps/main-server/src/modules/formulations/formulation.controller.ts
```

Change behavior:

- `POST /formulations` accepts `materials[]` and optional `processingRun`
- `PUT /formulations/:id` updates formulation metadata, replaces `materials[]`, optionally appends or updates latest `processingRun`
- `GET /formulations/:id` returns:
  - `materials[]` with supplier info
  - `latestProcessingRun`

### New Processing Run Endpoints

Add module:

```text
apps/main-server/src/modules/processing-runs/processing-run.module.ts
apps/main-server/src/modules/processing-runs/processing-run.service.ts
apps/main-server/src/infrastructure/repositories/processing-run.repository.ts
```

Routes:

- `GET /formulations/:id/processing-runs`
- `POST /formulations/:id/processing-runs`
- `PUT /formulations/:id/processing-runs/:runId`

### Result API Expansion

Update:

```text
apps/main-server/src/modules/test-results/test-result.service.ts
apps/main-server/src/infrastructure/repositories/test-result.repository.ts
```

Add support for:

- `crackPropagationObservations`
- `hotTemperaturePerformance`
- `coldTemperaturePerformance`
- `humidityExposureResults`
- `playerFeedback`

### Catalog API

Add lightweight lookup endpoints for editor dropdowns:

- `GET /materials`
- `GET /suppliers`

Needed for:

- component selection
- supplier selection

## Repository Delta

`FormulationRepository`

- Wrap create/update in transactions
- Insert/update/delete `formulation_materials` rows with full replacement semantics
- Join suppliers when loading `materials[]`
- Load latest processing run with formulation detail

`TestResultRepository`

- Persist new text fields for durability, environmental, and subjective tables

`ProcessingRunRepository`

- `findLatestByFormulation(formulationId)`
- `findAllByFormulation(formulationId)`
- `create(formulationId, dto)`
- `update(runId, dto)`

## UI Delta

### Formulation Editor

Update:

```text
apps/dashboard/src/features/formulations/FormulationForm.tsx
apps/dashboard/src/features/formulations/FormulationEditorPage.tsx
apps/dashboard/src/services/api.ts
```

Add sections:

- Composition table
  - material
  - supplier
  - percent composition
  - lot number
  - notes
- Manufacturing / processing
  - mold used
  - injection pressure
  - melt temperature
  - cooling time
  - cycle time
  - machine used
  - processing notes

### Formulation Detail

Update:

```text
apps/dashboard/src/features/formulations/FormulationDetailPage.tsx
```

Add cards for:

- component composition with supplier + lot
- latest processing run

### Test Results

Update:

```text
apps/dashboard/src/features/test-results/TestResultsPage.tsx
```

Add text inputs / textareas for:

- `crackPropagationObservations`
- `hotTemperaturePerformance`
- `coldTemperaturePerformance`
- `humidityExposureResults`
- `playerFeedback`

Keep existing numeric scoring inputs.

## Validation Rules

Add server-side validation:

- `materials[].percentage` total must equal `100` with small tolerance
- each material row requires `materialId`, `percentage`
- `processingRun.injectionPressure >= 0`
- `processingRun.meltTempC >= 0`
- `processingRun.coolingTimeS >= 0`
- `processingRun.cycleTimeS >= 0`
- durability/environmental/subjective existing numeric bounds remain

## Tests Required

Add or expand:

```text
apps/main-server/src/modules/formulations/__tests__/formulation.api.test.ts
apps/main-server/src/modules/test-results/__tests__/test-results.api.test.ts
apps/main-server/src/infrastructure/repositories/__tests__/repository.integration.test.ts
```

Coverage:

- create formulation with materials + processing run
- update formulation and replace composition rows
- get formulation detail with supplier-enriched materials + latest processing run
- save durability text observations
- save environmental text results
- save subjective player feedback
- reject composition totals not equal to `100`

## File Delta

New:

```text
apps/main-server/src/database/migrations/003_centralized_formulation_expansion.sql
apps/main-server/src/infrastructure/repositories/processing-run.repository.ts
apps/main-server/src/modules/processing-runs/processing-run.module.ts
apps/main-server/src/modules/processing-runs/processing-run.service.ts
docs/steps/step-11-centralized-formulation-expansion.md
```

Changed:

```text
apps/main-server/src/app.ts
apps/main-server/src/infrastructure/repositories/formulation.repository.ts
apps/main-server/src/infrastructure/repositories/test-result.repository.ts
apps/main-server/src/modules/formulations/formulation.controller.ts
apps/main-server/src/modules/formulations/formulation.service.ts
apps/main-server/src/modules/test-results/test-result.service.ts
apps/dashboard/src/features/formulations/FormulationDetailPage.tsx
apps/dashboard/src/features/formulations/FormulationEditorPage.tsx
apps/dashboard/src/features/formulations/FormulationForm.tsx
apps/dashboard/src/features/test-results/TestResultsPage.tsx
apps/dashboard/src/services/api.ts
packages/shared/src/contracts/domain.contract.ts
packages/shared/src/types/domain.ts
```

## Acceptance Criteria

- Every required field in the centralized formulation database requirement has a dedicated storage location
- Every required field is writable through the API
- Every required field is visible in the dashboard
- Composition and manufacturing data are part of the formulation workflow, not DB-only side tables
- Scoring/report flows continue working with the expanded result schema
