-- Migration 015: Generated report snapshots

CREATE TABLE IF NOT EXISTS generated_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  production_run_id UUID NOT NULL REFERENCES production_runs(id) ON DELETE CASCADE,
  primary_score_report_id UUID REFERENCES score_reports(id) ON DELETE SET NULL,
  report_name VARCHAR(255) NOT NULL,
  report_type VARCHAR(100) NOT NULL DEFAULT 'formulation_score_report',
  status VARCHAR(50) NOT NULL DEFAULT 'generated',
  report_snapshot JSONB NOT NULL,
  generated_by UUID REFERENCES app_users(id),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_generated_reports_run ON generated_reports(production_run_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_primary_score ON generated_reports(primary_score_report_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_generated_at ON generated_reports(generated_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_generated_reports_updated_at'
  ) THEN
    CREATE TRIGGER trg_generated_reports_updated_at
    BEFORE UPDATE ON generated_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END;
$$;
