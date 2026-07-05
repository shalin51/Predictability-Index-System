-- Migration 014: Benchmark scoring reports

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'traffic_light_status') THEN
    CREATE TYPE traffic_light_status AS ENUM ('green', 'yellow', 'red', 'gray');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS score_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  production_run_id UUID NOT NULL REFERENCES production_runs(id) ON DELETE CASCADE,
  benchmark_profile_id UUID NOT NULL REFERENCES benchmark_profiles(id),
  algorithm_version_id UUID NOT NULL REFERENCES algorithm_versions(id),
  overall_similarity_score NUMERIC(8,4) NOT NULL,
  predictability_index NUMERIC(8,4) NOT NULL,
  production_readiness_score NUMERIC(8,4) NOT NULL,
  required_metric_completion_score NUMERIC(8,4) NOT NULL,
  traffic_light traffic_light_status NOT NULL DEFAULT 'gray',
  key_risks JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_best_match BOOLEAN NOT NULL DEFAULT false,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS score_report_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  score_report_id UUID NOT NULL REFERENCES score_reports(id) ON DELETE CASCADE,
  metric_id UUID NOT NULL REFERENCES metric_definitions(id),
  run_metric_summary_id UUID REFERENCES run_metric_summaries(id) ON DELETE SET NULL,
  condition_id UUID REFERENCES test_condition_definitions(id),
  run_mean_value NUMERIC(14,5),
  benchmark_target_mean NUMERIC(14,5),
  min_acceptable NUMERIC(14,5),
  max_acceptable NUMERIC(14,5),
  weight NUMERIC(8,5) NOT NULL DEFAULT 0,
  distance NUMERIC(14,5),
  normalized_distance NUMERIC(14,5),
  metric_score NUMERIC(8,4) NOT NULL DEFAULT 0,
  weighted_contribution NUMERIC(12,5) NOT NULL DEFAULT 0,
  traffic_light traffic_light_status NOT NULL DEFAULT 'gray',
  risk_level VARCHAR(50),
  risk_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_score_reports_run ON score_reports(production_run_id);
CREATE INDEX IF NOT EXISTS idx_score_reports_benchmark ON score_reports(benchmark_profile_id);
CREATE INDEX IF NOT EXISTS idx_score_report_metrics_report ON score_report_metrics(score_report_id);
CREATE INDEX IF NOT EXISTS idx_score_report_metrics_metric ON score_report_metrics(metric_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_score_report_metrics_unique
  ON score_report_metrics (
    score_report_id,
    metric_id,
    COALESCE(condition_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['score_reports', 'score_report_metrics'] LOOP
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
