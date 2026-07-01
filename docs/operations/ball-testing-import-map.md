# Ball Testing Workbook Import Map

Source workbook: `D:\CCP\Projects\Ball Testing.xlsx`

## Workbook shape

- One sheet per ball or formulation.
- Rows are metric names.
- Columns `Sample 1` to `Sample 3` are raw replicate measurements.
- Current app schema does not preserve per-sample measurements. It stores one latest aggregate result per formulation.

## Sheet classification

Inferred from sheet names.

### Reference / benchmark sheets

- `LT48`
- `Selkirk`
- `X40`
- `Selkirk Pro S2`

These should feed:

- `benchmark_profiles`
- `benchmark_metric_targets`

### Client / formulation sheets

- `Kingfa - 30`
- `Exon EVA - 45`
- `EXPN EVA 30-7033`
- `EXON EVA15E`
- `EXON HD 5267 -10V`
- `EXON HD 6582-5V`
- `KINGFA - 5 7033`
- `6C - 15V`
- `EXON HD 5267-5V`
- `KINGFA -15 7033`
- `EXON HD 6582`
- `EXON HD 5267 - 5V`
- `KINGFA - 10 7033`
- `EXON EVA`
- `EXON EVA - 20 7033`

These should feed:

- `formulations`
- `test_results`

Sheets with no numeric data should create nothing yet unless the client wants placeholder formulation records.

## Exact field mapping

| Workbook row | Current destination | Benchmark metric name | Notes |
|---|---|---|---|
| `Weight` | `test_results.weight_g` | `weight` | Direct numeric import. |
| `Compression @ 1/4 inch` | `test_results.compression_kg` | `compression` | Workbook is in `lbf`. Convert to `kgf` with `value * 0.45359237` before import. |
| `Hardness` | `test_results.hardness_shore_d` | `hardness` | Use only if client confirms this is Shore D. |
| `Wall Thickness` | `test_results.wall_thickness_mm` | `wall_thickness` | Direct numeric import. |
| `Diameter` | `test_results.diameter_mm` | `diameter` | Direct numeric import. |
| `Drop Test` | `test_results.bounce_cm` | `bounce` | Only if the client defines this row as bounce height in cm. Current workbook cells are empty. |
| `Stretch @ 1/4 inch` | none | none | Needs schema support. |
| `Full Stretch max` | none | none | Needs schema support. |

## Current import rule

### For benchmark sheets

- Average the three samples for each supported metric.
- Write the average into `benchmark_metric_targets.target_value`.
- Set `min_acceptable`, `max_acceptable`, `standard_deviation`, `weight`, and `criticality` separately.
- Do not overwrite the existing benchmark envelopes blindly; these workbook values are observed samples, not full acceptance bands.

### For formulation sheets

- Create one `formulations` row per sheet.
- Average the three samples for each supported metric.
- Write the averages into one `test_results` row for that formulation.
- Do not drop the raw sample values if traceability matters. Current schema will lose them.

## Averaged values from populated sheets

### Benchmark candidates

| Sheet | Weight g | Compression lbf | Compression kgf | Hardness | Wall mm | Diameter mm | Stretch@1/4 lbf | Full Stretch max lbf |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `LT48` | 25.7667 | 39.4000 | 17.8715 | 57.3333 | 2.0400 | 73.7367 | 196.0000 | 232.6667 |
| `Selkirk` | 26.3000 | 36.4000 | 16.5118 | 55.4667 | 2.0667 | 73.8000 | 194.0000 | 221.0000 |
| `X40` | 26.0000 | 32.9667 | 14.9534 | 54.5000 | 2.1000 | 73.8333 | 176.8667 | 208.3333 |
| `Selkirk Pro S2` | 25.8667 | 36.5000 | 16.5571 | 55.8333 | 1.9333 | 74.6000 | 197.0000 | 250.3333 |

### Formulation candidates

| Sheet | Weight g | Compression lbf | Compression kgf | Hardness | Wall mm | Diameter mm | Stretch@1/4 lbf | Full Stretch max lbf |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `Kingfa - 30` | 24.7000 | 46.0000 | 20.8652 | 57.1667 | 1.9333 | 73.7333 | 213.6667 | 249.6667 |
| `Exon EVA - 45` | 25.1000 | 50.2000 | 22.7703 | 54.8000 | 1.8667 | 73.8667 | 88.3333 | — |

## Gaps in the current schema

### Missing raw sample storage

Current code returns only the latest aggregate row:

- `main-server/src/infrastructure/repositories/test-result.repository.ts`

Needed if you want to preserve `Sample 1` to `Sample 3`:

- new table `test_result_samples`
- columns:
  - `id`
  - `formulation_id`
  - `sample_label`
  - `tested_at`
  - `weight_g`
  - `compression_lbf`
  - `stretch_quarter_inch_lbf`
  - `full_stretch_max_lbf`
  - `hardness_shore_d`
  - `wall_thickness_mm`
  - `diameter_mm`
  - `drop_test_value`
  - `notes`

### Missing stretch metrics

Current scoring and contracts have no destination for:

- `Stretch @ 1/4 inch`
- `Full Stretch max`

Needed:

- add fields to shared contracts
- add DB columns or a dedicated mechanical test table
- add repository/service/controller support
- decide whether scoring uses these metrics

### Unit mismatch

`compression_kg` in the app is not the same unit as workbook `lbf`.

Needed:

- define canonical unit for compression
- convert on import
- document it in the import path

## Recommended implementation path

### Minimal path

- Import benchmark sheets as benchmark target averages for supported metrics only.
- Import client sheets as formulations plus averaged `test_results`.
- Ignore stretch rows for now.

### Correct path

- Add raw sample storage.
- Add explicit stretch fields.
- Add import logic that stores both raw samples and derived averages.
- Keep benchmark envelopes separate from observed benchmark sample means.
