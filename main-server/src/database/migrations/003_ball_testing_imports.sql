-- ============================================================
-- Migration 003: Ball testing workbook imports
-- Preserves workbook provenance, raw samples, and mechanical metrics
-- ============================================================

ALTER TABLE test_results
  ADD COLUMN IF NOT EXISTS stretch_quarter_inch_lbf NUMERIC(10,4),
  ADD COLUMN IF NOT EXISTS full_stretch_max_lbf NUMERIC(10,4);

CREATE TABLE IF NOT EXISTS ball_testing_import_batches (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workbook_name TEXT        NOT NULL,
  imported_by   TEXT        NOT NULL DEFAULT 'system',
  imported_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ball_testing_import_sheets (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id          UUID        NOT NULL REFERENCES ball_testing_import_batches(id) ON DELETE CASCADE,
  sheet_name        TEXT        NOT NULL,
  classification    TEXT        NOT NULL,
  formulation_id    UUID        REFERENCES formulations(id) ON DELETE SET NULL,
  benchmark_id      UUID        REFERENCES benchmark_profiles(id) ON DELETE SET NULL,
  sample_count      INTEGER     NOT NULL DEFAULT 0,
  benchmark_metrics JSONB,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ball_testing_import_samples (
  id                         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  import_sheet_id            UUID        NOT NULL REFERENCES ball_testing_import_sheets(id) ON DELETE CASCADE,
  formulation_id             UUID        REFERENCES formulations(id) ON DELETE SET NULL,
  benchmark_id               UUID        REFERENCES benchmark_profiles(id) ON DELETE SET NULL,
  sample_label               TEXT        NOT NULL,
  weight_g                   NUMERIC(10,4),
  compression_lbf            NUMERIC(10,4),
  compression_kg             NUMERIC(10,4),
  stretch_quarter_inch_lbf   NUMERIC(10,4),
  full_stretch_max_lbf       NUMERIC(10,4),
  hardness_shore_d           NUMERIC(10,4),
  wall_thickness_mm          NUMERIC(10,4),
  diameter_mm                NUMERIC(10,4),
  drop_test_cm               NUMERIC(10,4),
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (import_sheet_id, sample_label)
);

CREATE INDEX IF NOT EXISTS idx_ball_testing_batches_imported_at
  ON ball_testing_import_batches(imported_at DESC);

CREATE INDEX IF NOT EXISTS idx_ball_testing_sheets_batch
  ON ball_testing_import_sheets(batch_id);

CREATE INDEX IF NOT EXISTS idx_ball_testing_sheets_formulation
  ON ball_testing_import_sheets(formulation_id);

CREATE INDEX IF NOT EXISTS idx_ball_testing_sheets_benchmark
  ON ball_testing_import_sheets(benchmark_id);

CREATE INDEX IF NOT EXISTS idx_ball_testing_samples_sheet
  ON ball_testing_import_samples(import_sheet_id);

CREATE INDEX IF NOT EXISTS idx_ball_testing_samples_formulation
  ON ball_testing_import_samples(formulation_id);

CREATE INDEX IF NOT EXISTS idx_ball_testing_samples_benchmark
  ON ball_testing_import_samples(benchmark_id);
