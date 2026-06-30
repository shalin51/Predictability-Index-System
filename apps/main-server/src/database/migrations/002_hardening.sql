-- ============================================================
-- Migration 002: API versioning, ML readiness, security
-- ============================================================

-- ── API versioning table ─────────────────────────────────────
CREATE TABLE api_versions (
  version     TEXT PRIMARY KEY,
  status      TEXT NOT NULL DEFAULT 'active',  -- active | deprecated | sunset
  released_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sunset_at   TIMESTAMPTZ,
  notes       TEXT
);

INSERT INTO api_versions (version, status, notes) VALUES
  ('v1', 'active', 'Initial release — Performance Distance Score engine');

-- ── User / role placeholder ───────────────────────────────────
CREATE TABLE users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT        NOT NULL UNIQUE,
  email         TEXT        NOT NULL UNIQUE,
  role          TEXT        NOT NULL DEFAULT 'viewer',
    -- viewer | analyst | lab_technician | admin
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert system user
INSERT INTO users (username, email, role) VALUES
  ('system', 'system@amfpi.internal', 'admin');

-- ── ML training data export view ─────────────────────────────
-- Flat view of all formulations + all test data + best scores
-- for ML model training in a later phase

CREATE OR REPLACE VIEW ml_training_export AS
SELECT
  f.id                       AS formulation_id,
  f.formulation_code,
  f.name                     AS formulation_name,
  f.status,
  f.produced_date,
  f.lot_number,
  -- Physical / Performance
  tr.weight_g,
  tr.diameter_mm,
  tr.wall_thickness_mm,
  tr.roundness_mm,
  tr.balance_g,
  tr.bounce_cm,
  tr.hardness_shore_d,
  tr.compression_kg,
  tr.deflection_mm,
  tr.coefficient_of_restitution,
  -- Durability
  dr.air_cannon_cycles,
  dr.crack_initiation_cycles,
  dr.crack_propagation_mm,
  dr.deformation_mm,
  -- Environmental
  er.hot_performance_score,
  er.cold_performance_score,
  er.humidity_performance_score,
  er.test_temp_hot_c,
  er.test_temp_cold_c,
  er.test_humidity_pct,
  -- Subjective
  sr.feel_score,
  sr.sound_score,
  sr.perceived_speed_score,
  sr.perceived_durability_score,
  -- Material composition (JSON)
  (
    SELECT json_agg(json_build_object(
      'material_name', m.name,
      'percentage', fm.percentage
    ))
    FROM formulation_materials fm
    JOIN materials m ON m.id = fm.material_id
    WHERE fm.formulation_id = f.id
  ) AS composition
FROM formulations f
LEFT JOIN LATERAL (
  SELECT * FROM test_results
  WHERE formulation_id = f.id
  ORDER BY tested_at DESC LIMIT 1
) tr ON TRUE
LEFT JOIN LATERAL (
  SELECT * FROM durability_results
  WHERE formulation_id = f.id
  ORDER BY tested_at DESC LIMIT 1
) dr ON TRUE
LEFT JOIN LATERAL (
  SELECT * FROM environmental_results
  WHERE formulation_id = f.id
  ORDER BY tested_at DESC LIMIT 1
) er ON TRUE
LEFT JOIN LATERAL (
  SELECT * FROM subjective_ratings
  WHERE formulation_id = f.id
  ORDER BY rated_at DESC LIMIT 1
) sr ON TRUE
WHERE f.status IN ('testing', 'approved');

-- ── Request log table ─────────────────────────────────────────
CREATE TABLE request_logs (
  id            BIGSERIAL   PRIMARY KEY,
  method        TEXT        NOT NULL,
  path          TEXT        NOT NULL,
  status_code   INTEGER     NOT NULL,
  duration_ms   INTEGER,
  user_id       TEXT,
  ip_address    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_request_logs_created_at ON request_logs(created_at);
CREATE INDEX idx_request_logs_status     ON request_logs(status_code);

-- ── Performance index for common query patterns ───────────────
CREATE INDEX idx_formulations_status_date ON formulations(status, produced_date DESC);
CREATE INDEX idx_audit_log_changed_by     ON audit_log(changed_by);
