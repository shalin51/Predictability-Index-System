-- ============================================================
-- Migration 001: Core Schema
-- Creates all tables for the Predictability Index System
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Suppliers ───────────────────────────────────────────────
CREATE TABLE suppliers (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL UNIQUE,
  contact_email TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Materials (raw material catalog) ────────────────────────
CREATE TABLE materials (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT        NOT NULL,
  material_type   TEXT        NOT NULL,  -- polymer, additive, colorant, filler, etc.
  supplier_id     UUID        REFERENCES suppliers(id) ON DELETE SET NULL,
  unit            TEXT        NOT NULL DEFAULT 'kg',
  description     TEXT,
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (name, material_type)
);

-- ── Formulations ────────────────────────────────────────────
CREATE TABLE formulations (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  formulation_code  TEXT        NOT NULL UNIQUE,
  name              TEXT        NOT NULL,
  description       TEXT,
  version           INTEGER     NOT NULL DEFAULT 1,
  status            TEXT        NOT NULL DEFAULT 'draft',
    -- draft | testing | approved | rejected | archived
  produced_date     DATE,
  lot_number        TEXT,
  batch_size_kg     NUMERIC(10,3),
  notes             TEXT,
  created_by        TEXT        NOT NULL DEFAULT 'system',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Formulation ↔ Material composition ──────────────────────
CREATE TABLE formulation_materials (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  formulation_id  UUID        NOT NULL REFERENCES formulations(id) ON DELETE CASCADE,
  material_id     UUID        NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
  percentage      NUMERIC(7,4) NOT NULL CHECK (percentage > 0 AND percentage <= 100),
  lot_number      TEXT,
  notes           TEXT,
  UNIQUE (formulation_id, material_id)
);

-- ── Processing runs ─────────────────────────────────────────
CREATE TABLE processing_runs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  formulation_id    UUID        NOT NULL REFERENCES formulations(id) ON DELETE CASCADE,
  run_date          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  mold_temp_c       NUMERIC(6,2),
  melt_temp_c       NUMERIC(6,2),
  injection_speed   NUMERIC(8,2),
  holding_pressure  NUMERIC(8,2),
  cooling_time_s    NUMERIC(6,2),
  operator          TEXT,
  machine_id        TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Physical test results ────────────────────────────────────
CREATE TABLE test_results (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  formulation_id      UUID        NOT NULL REFERENCES formulations(id) ON DELETE CASCADE,
  tested_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tested_by           TEXT,
  -- Physical
  weight_g            NUMERIC(8,4),
  diameter_mm         NUMERIC(8,4),
  wall_thickness_mm   NUMERIC(8,4),
  roundness_mm        NUMERIC(8,4),
  balance_g           NUMERIC(8,4),
  -- Performance
  bounce_cm           NUMERIC(8,2),
  hardness_shore_d    NUMERIC(6,2),
  compression_kg      NUMERIC(8,2),
  deflection_mm       NUMERIC(8,4),
  coefficient_of_restitution NUMERIC(6,4),
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Durability test results ──────────────────────────────────
CREATE TABLE durability_results (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  formulation_id        UUID        NOT NULL REFERENCES formulations(id) ON DELETE CASCADE,
  tested_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tested_by             TEXT,
  air_cannon_cycles     INTEGER,
  crack_initiation_cycles INTEGER,
  crack_propagation_mm  NUMERIC(8,4),
  deformation_mm        NUMERIC(8,4),
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Environmental test results ───────────────────────────────
CREATE TABLE environmental_results (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  formulation_id        UUID        NOT NULL REFERENCES formulations(id) ON DELETE CASCADE,
  tested_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tested_by             TEXT,
  hot_performance_score NUMERIC(5,2) CHECK (hot_performance_score BETWEEN 0 AND 100),
  cold_performance_score NUMERIC(5,2) CHECK (cold_performance_score BETWEEN 0 AND 100),
  humidity_performance_score NUMERIC(5,2) CHECK (humidity_performance_score BETWEEN 0 AND 100),
  test_temp_hot_c       NUMERIC(6,2),
  test_temp_cold_c      NUMERIC(6,2),
  test_humidity_pct     NUMERIC(5,2),
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Subjective ratings ───────────────────────────────────────
CREATE TABLE subjective_ratings (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  formulation_id        UUID        NOT NULL REFERENCES formulations(id) ON DELETE CASCADE,
  rated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rated_by              TEXT,
  feel_score            INTEGER CHECK (feel_score BETWEEN 1 AND 10),
  sound_score           INTEGER CHECK (sound_score BETWEEN 1 AND 10),
  perceived_speed_score INTEGER CHECK (perceived_speed_score BETWEEN 1 AND 10),
  perceived_durability_score INTEGER CHECK (perceived_durability_score BETWEEN 1 AND 10),
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Benchmark profiles ───────────────────────────────────────
CREATE TABLE benchmark_profiles (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL UNIQUE,
  description   TEXT,
  ball_brand    TEXT        NOT NULL,
  ball_model    TEXT        NOT NULL,
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Benchmark metric targets ─────────────────────────────────
CREATE TABLE benchmark_metric_targets (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  benchmark_id        UUID        NOT NULL REFERENCES benchmark_profiles(id) ON DELETE CASCADE,
  metric_name         TEXT        NOT NULL,
  metric_category     TEXT        NOT NULL,
    -- physical | performance | durability | environmental | subjective
  target_value        NUMERIC(12,4) NOT NULL,
  min_acceptable      NUMERIC(12,4),
  max_acceptable      NUMERIC(12,4),
  standard_deviation  NUMERIC(12,4),
  weight              NUMERIC(5,4) NOT NULL DEFAULT 1.0 CHECK (weight >= 0 AND weight <= 1),
  criticality         TEXT        NOT NULL DEFAULT 'normal',
    -- low | normal | high | critical
  unit                TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (benchmark_id, metric_name)
);

-- ── Audit trail ──────────────────────────────────────────────
CREATE TABLE audit_log (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name    TEXT        NOT NULL,
  record_id     UUID        NOT NULL,
  action        TEXT        NOT NULL, -- INSERT | UPDATE | DELETE
  changed_by    TEXT        NOT NULL DEFAULT 'system',
  old_values    JSONB,
  new_values    JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────

-- formulations
CREATE INDEX idx_formulations_produced_date  ON formulations(produced_date);
CREATE INDEX idx_formulations_status         ON formulations(status);
CREATE INDEX idx_formulations_lot_number     ON formulations(lot_number);

-- formulation_materials
CREATE INDEX idx_formulation_materials_formulation ON formulation_materials(formulation_id);

-- test_results
CREATE INDEX idx_test_results_formulation    ON test_results(formulation_id);
CREATE INDEX idx_test_results_tested_at      ON test_results(tested_at);

-- durability_results
CREATE INDEX idx_durability_results_formulation ON durability_results(formulation_id);

-- environmental_results
CREATE INDEX idx_environmental_results_formulation ON environmental_results(formulation_id);

-- subjective_ratings
CREATE INDEX idx_subjective_ratings_formulation ON subjective_ratings(formulation_id);

-- benchmark_metric_targets
CREATE INDEX idx_benchmark_targets_benchmark ON benchmark_metric_targets(benchmark_id);
CREATE INDEX idx_benchmark_targets_metric    ON benchmark_metric_targets(metric_name);

-- audit_log
CREATE INDEX idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_created_at   ON audit_log(created_at);

-- ── Automatic updated_at trigger ────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'suppliers', 'materials', 'formulations',
    'test_results', 'durability_results', 'environmental_results',
    'subjective_ratings', 'benchmark_profiles', 'benchmark_metric_targets'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated_at
       BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
      tbl, tbl
    );
  END LOOP;
END;
$$;
