-- Migration 012: Lab testing raw result entry

CREATE TABLE IF NOT EXISTS sample_test_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sample_id UUID NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
  metric_id UUID NOT NULL REFERENCES metric_definitions(id),
  test_method_id UUID REFERENCES test_method_definitions(id),
  value_numeric NUMERIC(14,5) NOT NULL,
  unit VARCHAR(50),
  tested_by VARCHAR(255),
  tested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  audit_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sample_id, metric_id, test_method_id)
);

CREATE TABLE IF NOT EXISTS sample_observations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sample_id UUID NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
  observation_type VARCHAR(100) NOT NULL DEFAULT 'general',
  observation_text TEXT NOT NULL,
  observed_by VARCHAR(255),
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  audit_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS environmental_test_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sample_id UUID NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
  metric_id UUID NOT NULL REFERENCES metric_definitions(id),
  test_condition_id UUID REFERENCES test_condition_definitions(id),
  test_method_id UUID REFERENCES test_method_definitions(id),
  value_numeric NUMERIC(14,5) NOT NULL,
  unit VARCHAR(50),
  tested_by VARCHAR(255),
  tested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  audit_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sample_id, metric_id, test_condition_id, test_method_id)
);

CREATE TABLE IF NOT EXISTS sample_subjective_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sample_id UUID NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
  metric_id UUID REFERENCES metric_definitions(id),
  rating_value NUMERIC(6,2),
  feedback_text TEXT,
  rated_by VARCHAR(255),
  rated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  audit_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sample_id, metric_id)
);

CREATE INDEX IF NOT EXISTS idx_sample_test_results_sample ON sample_test_results(sample_id);
CREATE INDEX IF NOT EXISTS idx_sample_test_results_metric ON sample_test_results(metric_id);
CREATE INDEX IF NOT EXISTS idx_sample_observations_sample ON sample_observations(sample_id);
CREATE INDEX IF NOT EXISTS idx_environmental_test_results_sample ON environmental_test_results(sample_id);
CREATE INDEX IF NOT EXISTS idx_environmental_test_results_metric ON environmental_test_results(metric_id);
CREATE INDEX IF NOT EXISTS idx_sample_subjective_ratings_sample ON sample_subjective_ratings(sample_id);
CREATE INDEX IF NOT EXISTS idx_sample_subjective_ratings_metric ON sample_subjective_ratings(metric_id);

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'sample_test_results',
    'sample_observations',
    'environmental_test_results',
    'sample_subjective_ratings'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_trigger
      WHERE tgname = format('trg_%s_updated_at', tbl)
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER trg_%I_updated_at
         BEFORE UPDATE ON %I
         FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
        tbl,
        tbl
      );
    END IF;
  END LOOP;
END;
$$;
