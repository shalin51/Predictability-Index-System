-- Migration 013: Run metric summaries

CREATE TABLE IF NOT EXISTS run_metric_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  production_run_id UUID NOT NULL REFERENCES production_runs(id) ON DELETE CASCADE,
  metric_id UUID NOT NULL REFERENCES metric_definitions(id),
  condition_id UUID REFERENCES test_condition_definitions(id),
  n_samples INT NOT NULL,
  mean_value NUMERIC(14,5) NOT NULL,
  std_dev NUMERIC(14,5) NOT NULL DEFAULT 0,
  min_value NUMERIC(14,5) NOT NULL,
  max_value NUMERIC(14,5) NOT NULL,
  unit VARCHAR(50),
  source_table VARCHAR(100) NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_run_metric_summaries_unique
  ON run_metric_summaries (
    production_run_id,
    metric_id,
    COALESCE(condition_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(unit, '')
  );

CREATE INDEX IF NOT EXISTS idx_run_metric_summaries_run ON run_metric_summaries(production_run_id);
CREATE INDEX IF NOT EXISTS idx_run_metric_summaries_metric ON run_metric_summaries(metric_id);
CREATE INDEX IF NOT EXISTS idx_run_metric_summaries_condition ON run_metric_summaries(condition_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_run_metric_summaries_updated_at'
  ) THEN
    CREATE TRIGGER trg_run_metric_summaries_updated_at
    BEFORE UPDATE ON run_metric_summaries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END;
$$;
