ALTER TABLE processing_runs
  ADD COLUMN IF NOT EXISTS mold_used TEXT,
  ADD COLUMN IF NOT EXISTS injection_pressure NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS cycle_time_s NUMERIC(8,2);
