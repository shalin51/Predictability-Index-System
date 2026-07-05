-- Migration 009: Formulations workflow

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'formulation_status') THEN
    CREATE TYPE formulation_status AS ENUM ('draft', 'approved', 'molded', 'testing', 'scored', 'archived');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS experiments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experiment_code VARCHAR(100) UNIQUE,
  experiment_name VARCHAR(255) NOT NULL UNIQUE,
  status record_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS formulation_families (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_name VARCHAR(255) NOT NULL UNIQUE,
  status record_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS formulations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  formulation_code VARCHAR(100) NOT NULL,
  version_no INT NOT NULL DEFAULT 1,
  experiment_id UUID REFERENCES experiments(id),
  family_id UUID REFERENCES formulation_families(id),
  target_benchmark_id UUID REFERENCES benchmark_profiles(id),
  status formulation_status NOT NULL DEFAULT 'draft',
  notes TEXT,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (formulation_code, version_no)
);

CREATE TABLE IF NOT EXISTS formulation_components (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  formulation_id UUID NOT NULL REFERENCES formulations(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materials(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  material_lot_id UUID REFERENCES material_lots(id),
  percent_composition NUMERIC(8,4) NOT NULL,
  basis VARCHAR(50) NOT NULL DEFAULT 'weight_percent',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (percent_composition >= 0 AND percent_composition <= 100)
);

CREATE INDEX IF NOT EXISTS idx_formulations_status ON formulations(status);
CREATE INDEX IF NOT EXISTS idx_formulations_benchmark ON formulations(target_benchmark_id);
CREATE INDEX IF NOT EXISTS idx_formulation_components_formulation ON formulation_components(formulation_id);
CREATE INDEX IF NOT EXISTS idx_formulation_components_material ON formulation_components(material_id);

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'experiments',
    'formulation_families',
    'formulations',
    'formulation_components'
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
