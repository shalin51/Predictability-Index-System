CREATE TABLE scoring_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scoring_code VARCHAR(255) NOT NULL UNIQUE,
  profile_name VARCHAR(255) NOT NULL UNIQUE,
  status record_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE scoring_profile_weights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scoring_profile_id UUID NOT NULL REFERENCES scoring_profiles(id) ON DELETE CASCADE,
  metric_id UUID NOT NULL REFERENCES metric_definitions(id),
  weight NUMERIC(8,5) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (scoring_profile_id, metric_id)
);

CREATE OR REPLACE FUNCTION seed_scoring_profile_weights()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO scoring_profile_weights (scoring_profile_id, metric_id)
  SELECT NEW.id, id
  FROM metric_definitions
  WHERE metric_key IN ('weight', 'compression', 'stretch', 'full_stretch_max', 'hardness', 'wall_thickness', 'diameter', 'drop_test')
  ON CONFLICT (scoring_profile_id, metric_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_seed_scoring_profile_weights
AFTER INSERT ON scoring_profiles
FOR EACH ROW EXECUTE FUNCTION seed_scoring_profile_weights();

ALTER TABLE score_reports ADD COLUMN scoring_profile_id UUID REFERENCES scoring_profiles(id);
CREATE INDEX idx_score_reports_scoring_profile ON score_reports(scoring_profile_id);
CREATE UNIQUE INDEX idx_score_reports_run_benchmark_profile
  ON score_reports(production_run_id, benchmark_profile_id, scoring_profile_id);
