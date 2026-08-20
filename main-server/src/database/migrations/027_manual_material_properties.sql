-- Permit audited manual material-property assignments alongside imported facts.
ALTER TABLE material_property_facts
  ALTER COLUMN source_import_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_material_property_facts_updated_at') THEN
    CREATE TRIGGER trg_material_property_facts_updated_at
      BEFORE UPDATE ON material_property_facts
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END;
$$;
