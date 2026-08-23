-- Machine Setup Profiles: predefined parameter value sets for a machine
CREATE TABLE IF NOT EXISTS machine_setup_profiles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id   UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  profile_code TEXT NOT NULL UNIQUE,
  profile_name TEXT NOT NULL,
  parameters   JSONB NOT NULL DEFAULT '[]'::jsonb,
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_machine_setup_profiles_machine ON machine_setup_profiles(machine_id);
CREATE INDEX IF NOT EXISTS idx_machine_setup_profiles_status  ON machine_setup_profiles(status);

-- Trigger to auto-update updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_machine_setup_profiles_updated_at'
  ) THEN
    CREATE TRIGGER trg_machine_setup_profiles_updated_at
      BEFORE UPDATE ON machine_setup_profiles
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Add machine_setup_profile_id to production_runs
ALTER TABLE production_runs
  ADD COLUMN IF NOT EXISTS machine_setup_profile_id UUID REFERENCES machine_setup_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_production_runs_machine_setup_profile ON production_runs(machine_setup_profile_id);
