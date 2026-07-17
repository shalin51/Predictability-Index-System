-- Migration 016: Versioned process setup workbook imports

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'process_setup_revision_status') THEN
    CREATE TYPE process_setup_revision_status AS ENUM ('draft', 'approved', 'superseded', 'archived');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'setup_sheet_import_status') THEN
    CREATE TYPE setup_sheet_import_status AS ENUM ('uploaded', 'parsed', 'validation_failed', 'ready', 'committed', 'failed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'process_parameter_data_type') THEN
    CREATE TYPE process_parameter_data_type AS ENUM ('number', 'text', 'date');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS process_parameter_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parameter_key VARCHAR(160) UNIQUE NOT NULL,
  section_key VARCHAR(100) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  data_type process_parameter_data_type NOT NULL DEFAULT 'number',
  default_unit VARCHAR(50),
  sort_order INT NOT NULL DEFAULT 0,
  status record_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS setup_sheet_imports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status setup_sheet_import_status NOT NULL DEFAULT 'uploaded',
  original_filename VARCHAR(255) NOT NULL,
  file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 10485760),
  file_sha256 CHAR(64) UNIQUE NOT NULL,
  blob_object_key TEXT NOT NULL,
  template_key VARCHAR(100) NOT NULL,
  template_version VARCHAR(50) NOT NULL,
  parsed_snapshot JSONB,
  validation_results JSONB NOT NULL DEFAULT '{"errors":[],"warnings":[]}'::jsonb,
  imported_by_actor VARCHAR(255) NOT NULL,
  production_run_id UUID REFERENCES production_runs(id) ON DELETE SET NULL,
  failure_message TEXT,
  parsed_at TIMESTAMPTZ,
  committed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS process_setup_revisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id UUID NOT NULL REFERENCES machines(id),
  mold_id UUID NOT NULL REFERENCES molds(id),
  formulation_id UUID NOT NULL REFERENCES formulations(id),
  revision_no VARCHAR(80) NOT NULL,
  status process_setup_revision_status NOT NULL DEFAULT 'draft',
  setup_hash CHAR(64) NOT NULL,
  hot_runner_manufacturer VARCHAR(255),
  hot_runner_controller_model VARCHAR(255),
  hot_runner_zone_count INT CHECK (hot_runner_zone_count IS NULL OR hot_runner_zone_count > 0),
  approved_by_display VARCHAR(255),
  approved_by_actor VARCHAR(255),
  document_approval_date DATE,
  approved_at TIMESTAMPTZ,
  source_import_id UUID REFERENCES setup_sheet_imports(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (machine_id, mold_id, formulation_id, revision_no)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_process_setup_revisions_current_approved
  ON process_setup_revisions(machine_id, mold_id, formulation_id)
  WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_process_setup_revisions_status ON process_setup_revisions(status);

ALTER TABLE production_runs
  ADD COLUMN IF NOT EXISTS process_setup_revision_id UUID REFERENCES process_setup_revisions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS job_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS part_number VARCHAR(150),
  ADD COLUMN IF NOT EXISTS operator_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS shift_code VARCHAR(80);

CREATE INDEX IF NOT EXISTS idx_production_runs_setup_revision ON production_runs(process_setup_revision_id);

CREATE TABLE IF NOT EXISTS process_setup_revision_parameters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  process_setup_revision_id UUID NOT NULL REFERENCES process_setup_revisions(id) ON DELETE CASCADE,
  parameter_definition_id UUID NOT NULL REFERENCES process_parameter_definitions(id),
  position_type VARCHAR(50) NOT NULL DEFAULT 'single',
  position_index INT,
  position_label VARCHAR(160),
  value_numeric NUMERIC(16,6),
  value_text TEXT,
  value_date DATE,
  unit VARCHAR(50),
  tolerance_min NUMERIC(16,6),
  tolerance_max NUMERIC(16,6),
  notes TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(value_numeric, value_text, value_date) <= 1),
  CHECK (tolerance_min IS NULL OR tolerance_max IS NULL OR tolerance_min <= tolerance_max)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_process_setup_revision_parameters_unique
  ON process_setup_revision_parameters(
    process_setup_revision_id,
    parameter_definition_id,
    position_type,
    COALESCE(position_index, -1),
    COALESCE(position_label, '')
  );
CREATE INDEX IF NOT EXISTS idx_process_setup_revision_parameters_revision
  ON process_setup_revision_parameters(process_setup_revision_id);

CREATE TABLE IF NOT EXISTS production_run_process_values (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  production_run_id UUID NOT NULL REFERENCES production_runs(id) ON DELETE CASCADE,
  setup_parameter_id UUID REFERENCES process_setup_revision_parameters(id) ON DELETE SET NULL,
  parameter_definition_id UUID NOT NULL REFERENCES process_parameter_definitions(id),
  position_type VARCHAR(50) NOT NULL DEFAULT 'single',
  position_index INT,
  position_label VARCHAR(160),
  setpoint_numeric NUMERIC(16,6),
  setpoint_text TEXT,
  setpoint_date DATE,
  actual_numeric NUMERIC(16,6),
  actual_text TEXT,
  actual_date DATE,
  unit VARCHAR(50),
  tolerance_min NUMERIC(16,6),
  tolerance_max NUMERIC(16,6),
  notes TEXT,
  source_import_id UUID REFERENCES setup_sheet_imports(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(setpoint_numeric, setpoint_text, setpoint_date) <= 1),
  CHECK (num_nonnulls(actual_numeric, actual_text, actual_date) <= 1),
  CHECK (tolerance_min IS NULL OR tolerance_max IS NULL OR tolerance_min <= tolerance_max)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_production_run_process_values_unique
  ON production_run_process_values(
    production_run_id,
    parameter_definition_id,
    position_type,
    COALESCE(position_index, -1),
    COALESCE(position_label, '')
  );
CREATE INDEX IF NOT EXISTS idx_production_run_process_values_run ON production_run_process_values(production_run_id);

CREATE TABLE IF NOT EXISTS production_run_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  production_run_id UUID NOT NULL REFERENCES production_runs(id) ON DELETE CASCADE,
  note_type VARCHAR(80) NOT NULL,
  note_text TEXT NOT NULL,
  entered_by VARCHAR(255),
  source_import_id UUID REFERENCES setup_sheet_imports(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_production_run_notes_run ON production_run_notes(production_run_id);

CREATE TABLE IF NOT EXISTS production_run_material_lots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  production_run_id UUID NOT NULL REFERENCES production_runs(id) ON DELETE CASCADE,
  formulation_component_id UUID NOT NULL REFERENCES formulation_components(id),
  material_lot_id UUID REFERENCES material_lots(id),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  source_import_id UUID REFERENCES setup_sheet_imports(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (production_run_id, formulation_component_id)
);
CREATE INDEX IF NOT EXISTS idx_production_run_material_lots_run ON production_run_material_lots(production_run_id);

CREATE TABLE IF NOT EXISTS material_processing_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id UUID NOT NULL REFERENCES materials(id),
  profile_version INT NOT NULL DEFAULT 1,
  status process_setup_revision_status NOT NULL DEFAULT 'approved',
  profile_hash CHAR(64) NOT NULL,
  trade_name VARCHAR(255),
  manufacturer VARCHAR(255),
  grade VARCHAR(150),
  color_pigment VARCHAR(150),
  melt_flow_index NUMERIC(16,6),
  specific_gravity NUMERIC(16,6),
  shrink_rate NUMERIC(16,6),
  moisture_absorption_pct NUMERIC(16,6),
  approved_by_display VARCHAR(255),
  approved_by_actor VARCHAR(255),
  approved_at TIMESTAMPTZ,
  source_import_id UUID REFERENCES setup_sheet_imports(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (material_id, profile_version)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_material_processing_profiles_current_approved
  ON material_processing_profiles(material_id)
  WHERE status = 'approved';

CREATE TABLE IF NOT EXISTS material_processing_ranges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_processing_profile_id UUID NOT NULL REFERENCES material_processing_profiles(id) ON DELETE CASCADE,
  parameter_key VARCHAR(120) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  min_value NUMERIC(16,6),
  max_value NUMERIC(16,6),
  recommended_value NUMERIC(16,6),
  unit VARCHAR(50),
  notes TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (material_processing_profile_id, parameter_key),
  CHECK (min_value IS NULL OR max_value IS NULL OR min_value <= max_value)
);

CREATE TABLE IF NOT EXISTS material_drying_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  production_run_id UUID NOT NULL REFERENCES production_runs(id) ON DELETE CASCADE,
  material_lot_id UUID REFERENCES material_lots(id),
  dryer_code VARCHAR(120),
  setpoint_temperature NUMERIC(16,6),
  actual_temperature NUMERIC(16,6),
  temperature_unit VARCHAR(50) NOT NULL DEFAULT '°F',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_hours NUMERIC(12,4),
  approved_by_display VARCHAR(255),
  source_import_id UUID REFERENCES setup_sheet_imports(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ended_at IS NULL OR started_at IS NULL OR ended_at >= started_at),
  CHECK (duration_hours IS NULL OR duration_hours >= 0)
);
CREATE INDEX IF NOT EXISTS idx_material_drying_events_run ON material_drying_events(production_run_id);
CREATE INDEX IF NOT EXISTS idx_setup_sheet_imports_status_created ON setup_sheet_imports(status, created_at);
CREATE INDEX IF NOT EXISTS idx_setup_sheet_imports_run ON setup_sheet_imports(production_run_id);

CREATE TABLE IF NOT EXISTS process_setup_revision_log_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  process_setup_revision_id UUID NOT NULL REFERENCES process_setup_revisions(id) ON DELETE CASCADE,
  revision_no VARCHAR(80) NOT NULL,
  revision_date DATE,
  changed_by VARCHAR(255),
  approved_by VARCHAR(255),
  change_description TEXT,
  machine_status VARCHAR(100),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (process_setup_revision_id, revision_no)
);

ALTER TABLE setup_sheet_imports
  ADD COLUMN IF NOT EXISTS process_setup_revision_id UUID REFERENCES process_setup_revisions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS material_processing_profile_id UUID REFERENCES material_processing_profiles(id) ON DELETE SET NULL;

ALTER TABLE generated_reports
  ADD COLUMN IF NOT EXISTS snapshot_schema_version SMALLINT NOT NULL DEFAULT 1;

INSERT INTO process_parameter_definitions
  (parameter_key, section_key, display_name, data_type, default_unit, sort_order)
VALUES
  ('barrel.temperature', 'barrel_temperature', 'Barrel Temperature', 'number', '°F', 10),
  ('mold.temperature', 'mold_temperature', 'Mold Temperature', 'number', '°F', 20),
  ('mold.flow', 'mold_temperature', 'Mold Circuit Flow', 'number', 'GPM', 21),
  ('mold.inlet_temperature', 'mold_temperature', 'Mold Circuit Inlet Temperature', 'number', '°F', 22),
  ('mold.outlet_temperature', 'mold_temperature', 'Mold Circuit Outlet Temperature', 'number', '°F', 23),
  ('injection.speed', 'injection', 'Injection Speed', 'number', 'mm/s', 30),
  ('injection.pressure', 'injection', 'Injection Pressure', 'number', 'bar', 31),
  ('injection.vp_transfer_position', 'injection', 'V/P Transfer Position', 'number', 'mm', 32),
  ('injection.shot_size', 'injection', 'Shot Size', 'number', 'mm', 33),
  ('injection.cushion', 'injection', 'Cushion', 'number', 'mm', 34),
  ('injection.fill_time', 'injection', 'Fill Time', 'number', 'sec', 35),
  ('hold.pressure', 'hold_pack', 'Hold Pressure', 'number', 'bar', 40),
  ('hold.time', 'hold_pack', 'Hold Time', 'number', 'sec', 41),
  ('screw.speed', 'screw_recovery', 'Screw Speed', 'number', 'RPM', 50),
  ('screw.back_pressure', 'screw_recovery', 'Back Pressure', 'number', 'bar', 51),
  ('screw.decompression', 'screw_recovery', 'Decompression', 'number', 'mm', 52),
  ('screw.recovery_time', 'screw_recovery', 'Recovery Time', 'number', 'sec', 53),
  ('screw.diameter', 'screw_recovery', 'Screw Diameter', 'number', 'mm', 54),
  ('screw.ld_ratio', 'screw_recovery', 'L/D Ratio', 'number', NULL, 55),
  ('cycle.cooling_time', 'cooling_cycle', 'Cooling Time', 'number', 'sec', 60),
  ('cycle.total_time', 'cooling_cycle', 'Total Cycle Time', 'number', 'sec', 61),
  ('cycle.mold_open_time', 'cooling_cycle', 'Mold Open Time', 'number', 'sec', 62),
  ('cycle.mold_close_time', 'cooling_cycle', 'Mold Close Time', 'number', 'sec', 63),
  ('cycle.ejector_forward_time', 'cooling_cycle', 'Ejector Forward Time', 'number', 'sec', 64),
  ('cycle.ejector_return_time', 'cooling_cycle', 'Ejector Return Time', 'number', 'sec', 65),
  ('cycle.ejector_strokes', 'cooling_cycle', 'Ejector Strokes', 'number', 'count', 66),
  ('clamp.force', 'clamp_ejector', 'Clamp Force', 'number', 'kN', 70),
  ('clamp.mold_close_speed_fast', 'clamp_ejector', 'Mold Close Speed — Fast', 'number', 'mm/s', 71),
  ('clamp.mold_close_speed_slow', 'clamp_ejector', 'Mold Close Speed — Slow', 'number', 'mm/s', 72),
  ('clamp.mold_close_pressure', 'clamp_ejector', 'Mold Close Pressure', 'number', 'bar', 73),
  ('clamp.mold_open_speed_fast', 'clamp_ejector', 'Mold Open Speed — Fast', 'number', 'mm/s', 74),
  ('clamp.mold_open_speed_slow', 'clamp_ejector', 'Mold Open Speed — Slow', 'number', 'mm/s', 75),
  ('clamp.low_pressure_protection', 'clamp_ejector', 'Low Pressure Protection', 'number', 'bar', 76),
  ('clamp.ejector_forward_position', 'clamp_ejector', 'Ejector Forward Position', 'number', 'mm', 77),
  ('clamp.ejector_forward_speed', 'clamp_ejector', 'Ejector Forward Speed', 'number', 'mm/s', 78),
  ('clamp.ejector_retract_speed', 'clamp_ejector', 'Ejector Retract Speed', 'number', 'mm/s', 79),
  ('hot_runner.temperature', 'hot_runner', 'Hot Runner Temperature', 'number', '°F', 80),
  ('hot_runner.amperage', 'hot_runner', 'Hot Runner Amperage', 'number', 'A', 81),
  ('hot_runner.wattage', 'hot_runner', 'Hot Runner Wattage', 'number', 'W', 82),
  ('hot_runner.status', 'hot_runner', 'Hot Runner Status', 'text', NULL, 83),
  ('hot_runner.alarm_low', 'hot_runner', 'Hot Runner Alarm Low', 'number', '°F', 84),
  ('hot_runner.alarm_high', 'hot_runner', 'Hot Runner Alarm High', 'number', '°F', 85),
  ('hot_runner.last_tuned', 'hot_runner', 'Hot Runner Last Tuned', 'date', NULL, 86),
  ('hot_runner.soak_time', 'hot_runner', 'Hot Runner Soak Time', 'number', 'min', 87),
  ('hot_runner.minimum_soak_temperature', 'hot_runner', 'Minimum Soak Temperature', 'number', '°F', 88)
ON CONFLICT (parameter_key) DO UPDATE SET
  section_key = EXCLUDED.section_key,
  display_name = EXCLUDED.display_name,
  data_type = EXCLUDED.data_type,
  default_unit = EXCLUDED.default_unit,
  sort_order = EXCLUDED.sort_order;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'process_parameter_definitions',
    'setup_sheet_imports',
    'process_setup_revisions',
    'process_setup_revision_parameters',
    'production_run_process_values',
    'production_run_notes',
    'production_run_material_lots',
    'material_processing_profiles',
    'material_processing_ranges',
    'material_drying_events'
  ] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = format('trg_%s_updated_at', tbl)) THEN
      EXECUTE format(
        'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
        tbl,
        tbl
      );
    END IF;
  END LOOP;
END;
$$;
