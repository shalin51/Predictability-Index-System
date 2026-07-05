DROP VIEW IF EXISTS ml_training_export CASCADE;

DROP FUNCTION IF EXISTS enforce_score_report_required_metrics() CASCADE;
DROP FUNCTION IF EXISTS validate_required_metric_summaries(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS validate_benchmark_metric_weights(UUID) CASCADE;
DROP FUNCTION IF EXISTS enforce_formulation_approval_total() CASCADE;
DROP FUNCTION IF EXISTS validate_formulation_components_total(UUID) CASCADE;

DROP TABLE IF EXISTS
  score_report_metrics,
  score_reports,
  algorithm_versions,
  run_metric_summaries,
  sample_subjective_ratings,
  test_panelists,
  environmental_test_results,
  sample_observations,
  sample_test_results,
  test_condition_definitions,
  test_method_definitions,
  metric_definitions,
  samples,
  production_run_settings,
  production_runs,
  formulation_components,
  formulation_versions,
  formulation_families,
  experiments,
  ball_testing_import_samples,
  ball_testing_import_sheets,
  ball_testing_import_batches,
  subjective_ratings,
  environmental_results,
  durability_results,
  test_results,
  processing_runs,
  formulation_materials,
  benchmark_metric_targets,
  benchmark_profiles,
  formulations
CASCADE;

DROP TYPE IF EXISTS
  criticality_level,
  traffic_light,
  metric_data_type,
  metric_category,
  sample_status,
  run_status,
  formulation_status
CASCADE;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'metric_category') THEN
    CREATE TYPE metric_category AS ENUM ('physical', 'performance', 'durability', 'environmental', 'subjective');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'metric_data_type') THEN
    CREATE TYPE metric_data_type AS ENUM ('numeric', 'text', 'boolean', 'rating');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS metric_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_key VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  category metric_category NOT NULL,
  default_unit VARCHAR(50),
  data_type metric_data_type NOT NULL DEFAULT 'numeric',
  benchmark_comparable BOOLEAN NOT NULL DEFAULT true,
  required_for_scoring BOOLEAN NOT NULL DEFAULT false,
  higher_is_better BOOLEAN,
  status record_status NOT NULL DEFAULT 'active',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS test_method_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  method_code VARCHAR(100) UNIQUE NOT NULL,
  method_name VARCHAR(255) NOT NULL,
  metric_id UUID REFERENCES metric_definitions(id),
  cure_hours NUMERIC(10,2),
  description TEXT,
  status record_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS test_condition_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  condition_code VARCHAR(100) UNIQUE NOT NULL,
  condition_name VARCHAR(255) NOT NULL,
  description TEXT,
  status record_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS benchmark_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE,
  description TEXT,
  ball_brand TEXT NOT NULL DEFAULT '',
  ball_model TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  benchmark_code VARCHAR(100),
  benchmark_name VARCHAR(255),
  profile_version INT NOT NULL DEFAULT 1,
  status record_status NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS benchmark_metric_targets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  benchmark_id UUID REFERENCES benchmark_profiles(id) ON DELETE CASCADE,
  benchmark_profile_id UUID REFERENCES benchmark_profiles(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  metric_category TEXT NOT NULL,
  metric_id UUID REFERENCES metric_definitions(id),
  condition_id UUID REFERENCES test_condition_definitions(id),
  target_value NUMERIC(12,4),
  target_mean NUMERIC(14,5),
  min_acceptable NUMERIC(14,5),
  max_acceptable NUMERIC(14,5),
  standard_deviation NUMERIC(12,4),
  target_std_dev NUMERIC(14,5),
  weight NUMERIC(8,5) NOT NULL DEFAULT 0,
  criticality TEXT NOT NULL DEFAULT 'medium',
  unit TEXT,
  notes TEXT,
  required_for_pass BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (benchmark_id, metric_name)
);

CREATE INDEX IF NOT EXISTS idx_benchmark_metric_targets_profile
  ON benchmark_metric_targets(benchmark_profile_id);

CREATE TABLE IF NOT EXISTS algorithm_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  algorithm_code VARCHAR(100) NOT NULL,
  algorithm_name VARCHAR(255) NOT NULL,
  version VARCHAR(50) NOT NULL,
  description TEXT,
  config JSONB,
  status record_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (algorithm_code, version)
);
