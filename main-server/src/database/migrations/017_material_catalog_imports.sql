-- Migration 017: Material catalog, equipment capabilities, and fixed-template imports

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'material_import_status') THEN
    CREATE TYPE material_import_status AS ENUM ('parsed', 'validation_failed', 'ready', 'committed', 'failed');
  END IF;
END $$;

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(100),
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS website VARCHAR(500);

ALTER TABLE materials
  ADD COLUMN IF NOT EXISTS chemistry TEXT,
  ADD COLUMN IF NOT EXISTS role_in_blend TEXT;

ALTER TABLE machines
  ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(255),
  ADD COLUMN IF NOT EXISTS machine_type VARCHAR(150),
  ADD COLUMN IF NOT EXISTS model_number VARCHAR(150),
  ADD COLUMN IF NOT EXISTS serial_number VARCHAR(150),
  ADD COLUMN IF NOT EXISTS specifications JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE molds
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(255),
  ADD COLUMN IF NOT EXISTS hot_runner_controller VARCHAR(255),
  ADD COLUMN IF NOT EXISTS zone_count INT;

CREATE TABLE IF NOT EXISTS machine_parameter_capabilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  parameter_key VARCHAR(160) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  section_key VARCHAR(120) NOT NULL,
  position_type VARCHAR(50) NOT NULL DEFAULT 'single',
  position_index INT,
  position_label VARCHAR(255),
  minimum_value NUMERIC(16,6),
  maximum_value NUMERIC(16,6),
  unit VARCHAR(50),
  notes TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  status record_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (machine_id, parameter_key, position_type, position_index, position_label),
  CHECK (minimum_value IS NULL OR maximum_value IS NULL OR minimum_value <= maximum_value)
);

CREATE TABLE IF NOT EXISTS mold_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mold_id UUID NOT NULL REFERENCES molds(id) ON DELETE CASCADE,
  zone_number INT NOT NULL,
  zone_name VARCHAR(255),
  zone_type VARCHAR(100),
  minimum_temperature NUMERIC(16,6),
  maximum_temperature NUMERIC(16,6),
  temperature_unit VARCHAR(50) NOT NULL DEFAULT '°F',
  notes TEXT,
  status record_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (mold_id, zone_number),
  CHECK (zone_number > 0),
  CHECK (minimum_temperature IS NULL OR maximum_temperature IS NULL OR minimum_temperature <= maximum_temperature)
);

CREATE TABLE IF NOT EXISTS material_catalog_imports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status material_import_status NOT NULL,
  original_filename VARCHAR(500) NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  file_sha256 CHAR(64) NOT NULL UNIQUE,
  blob_object_key VARCHAR(1000) NOT NULL,
  template_key VARCHAR(100) NOT NULL,
  template_version VARCHAR(50) NOT NULL,
  parsed_snapshot JSONB NOT NULL,
  validation_results JSONB NOT NULL,
  commit_summary JSONB,
  imported_by_actor VARCHAR(255) NOT NULL,
  failure_message TEXT,
  parsed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  committed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS material_external_identifiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  namespace VARCHAR(120) NOT NULL,
  external_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (namespace, external_id),
  UNIQUE (material_id, namespace)
);

CREATE TABLE IF NOT EXISTS material_source_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  source_filename VARCHAR(500) NOT NULL,
  source_revision_date DATE,
  manufacturer VARCHAR(255),
  notes TEXT,
  source_import_id UUID NOT NULL REFERENCES material_catalog_imports(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (material_id, source_filename, source_revision_date)
);

CREATE TABLE IF NOT EXISTS material_property_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_key VARCHAR(100) UNIQUE NOT NULL,
  category VARCHAR(150) NOT NULL,
  canonical_name VARCHAR(255) NOT NULL,
  source_labels_synonyms TEXT,
  condition_dimensions TEXT,
  common_units TEXT,
  value_type VARCHAR(50) NOT NULL,
  origin VARCHAR(255),
  implementation_notes TEXT,
  status record_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS material_property_facts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  property_definition_id UUID NOT NULL REFERENCES material_property_definitions(id),
  source_document_id UUID REFERENCES material_source_documents(id) ON DELETE SET NULL,
  source_label VARCHAR(255) NOT NULL,
  value_numeric NUMERIC(38,10),
  value_text TEXT,
  qualifier VARCHAR(20),
  unit VARCHAR(100),
  test_method VARCHAR(255) NOT NULL,
  test_condition TEXT,
  temperature_c NUMERIC(16,6),
  load TEXT,
  duration TEXT,
  frequency TEXT,
  direction TEXT,
  specimen TEXT,
  process_type TEXT,
  zone TEXT,
  source_page VARCHAR(100),
  source_revision_date DATE,
  notes TEXT,
  fact_hash CHAR(64) NOT NULL,
  source_import_id UUID NOT NULL REFERENCES material_catalog_imports(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (material_id, fact_hash),
  CHECK (value_numeric IS NOT NULL OR NULLIF(value_text, '') IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_material_catalog_imports_status_created
  ON material_catalog_imports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_material_property_facts_material
  ON material_property_facts(material_id);
CREATE INDEX IF NOT EXISTS idx_material_property_facts_property
  ON material_property_facts(property_definition_id);
CREATE INDEX IF NOT EXISTS idx_machine_parameter_capabilities_machine
  ON machine_parameter_capabilities(machine_id);
CREATE INDEX IF NOT EXISTS idx_mold_zones_mold
  ON mold_zones(mold_id);

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'machine_parameter_capabilities',
    'mold_zones',
    'material_catalog_imports',
    'material_source_documents',
    'material_property_definitions'
  ] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = format('trg_%s_updated_at', tbl)) THEN
      EXECUTE format(
        'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
        tbl,
        tbl
      );
    END IF;
  END LOOP;
END;
$$;
