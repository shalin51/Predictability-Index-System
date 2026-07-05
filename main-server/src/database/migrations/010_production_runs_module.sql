-- Migration 010: Production runs and samples

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'production_run_status') THEN
    CREATE TYPE production_run_status AS ENUM (
      'planned',
      'molded',
      'curing',
      'ready_for_testing',
      'testing',
      'completed',
      'scored',
      'archived'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sample_status') THEN
    CREATE TYPE sample_status AS ENUM ('created', 'testing', 'tested', 'archived');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS production_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_code VARCHAR(150) UNIQUE NOT NULL,
  formulation_id UUID NOT NULL REFERENCES formulations(id),
  date_produced DATE NOT NULL,
  machine_id UUID NOT NULL REFERENCES machines(id),
  mold_id UUID NOT NULL REFERENCES molds(id),
  injection_pressure NUMERIC(12,4),
  injection_pressure_unit VARCHAR(25) NOT NULL DEFAULT 'psi',
  melt_temperature NUMERIC(12,4),
  melt_temperature_unit VARCHAR(25) NOT NULL DEFAULT 'C',
  cooling_time NUMERIC(12,4),
  cooling_time_unit VARCHAR(25) NOT NULL DEFAULT 'sec',
  cycle_time NUMERIC(12,4),
  cycle_time_unit VARCHAR(25) NOT NULL DEFAULT 'sec',
  cure_hours_before_test NUMERIC(12,4) NOT NULL DEFAULT 72,
  status production_run_status NOT NULL DEFAULT 'planned',
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS samples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  production_run_id UUID NOT NULL REFERENCES production_runs(id) ON DELETE CASCADE,
  sample_code VARCHAR(180) UNIQUE NOT NULL,
  cavity_number INT,
  status sample_status NOT NULL DEFAULT 'created',
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_production_runs_formulation ON production_runs(formulation_id);
CREATE INDEX IF NOT EXISTS idx_production_runs_status ON production_runs(status);
CREATE INDEX IF NOT EXISTS idx_production_runs_machine ON production_runs(machine_id);
CREATE INDEX IF NOT EXISTS idx_production_runs_mold ON production_runs(mold_id);
CREATE INDEX IF NOT EXISTS idx_samples_production_run ON samples(production_run_id);

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['production_runs', 'samples'] LOOP
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
