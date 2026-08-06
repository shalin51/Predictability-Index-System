-- Migration 019: Simplified material database catalog projections.
--
-- The existing normalized tables remain authoritative so formulation,
-- production-run, and workbook-import features continue to work. These
-- additive columns and views expose the four-table material model used by
-- the Materials workspace.

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS supplier_code VARCHAR(30),
  ADD COLUMN IF NOT EXISTS supplier_role VARCHAR(100),
  ADD COLUMN IF NOT EXISTS supplier_notes TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_suppliers_supplier_code_unique
  ON suppliers(supplier_code)
  WHERE supplier_code IS NOT NULL;

ALTER TABLE materials
  ADD COLUMN IF NOT EXISTS material_lot VARCHAR(150),
  ADD COLUMN IF NOT EXISTS product_grade VARCHAR(255),
  ADD COLUMN IF NOT EXISTS source_file VARCHAR(500),
  ADD COLUMN IF NOT EXISTS source_revision_date DATE;

UPDATE materials
SET product_grade = COALESCE(product_grade, material_name, name)
WHERE product_grade IS NULL;

ALTER TABLE material_property_facts
  ADD COLUMN IF NOT EXISTS source_file VARCHAR(500);

CREATE OR REPLACE VIEW material_suppliers AS
SELECT
  s.id,
  COALESCE(s.supplier_code, s.id::text) AS material_supplier_id,
  COALESCE(s.supplier_name, s.name) AS supplier_name,
  COALESCE(s.contact_info, s.contact_email) AS supplier_contact_info,
  COALESCE(s.supplier_role, s.supplier_type) AS role,
  COALESCE(s.supplier_notes, s.notes) AS note,
  s.status,
  s.created_at,
  s.updated_at
FROM suppliers s;

CREATE OR REPLACE VIEW material_property_catalog AS
SELECT
  mpd.id,
  mpd.property_key AS property_id,
  mpd.category,
  mpd.canonical_name AS canonical_property,
  mpd.source_labels_synonyms,
  mpd.condition_dimensions,
  mpd.common_units,
  mpd.value_type,
  COUNT(DISTINCT mpf.material_id)::int AS materials_covered,
  mpd.origin,
  mpd.implementation_notes,
  mpd.status,
  mpd.created_at,
  mpd.updated_at
FROM material_property_definitions mpd
LEFT JOIN material_property_facts mpf
  ON mpf.property_definition_id = mpd.id
GROUP BY mpd.id;

CREATE OR REPLACE VIEW material_properties AS
SELECT
  mpf.id AS material_property_id,
  m.id AS material_uuid,
  COALESCE(mei.external_id, m.material_code, m.id::text) AS material_id,
  COALESCE(m.product_grade, m.material_name, m.name) AS product_grade,
  mpd.property_key AS property_id,
  mpd.canonical_name AS property_name,
  mpf.source_label,
  mpf.value_numeric,
  mpf.value_text,
  mpf.qualifier,
  mpf.unit,
  mpf.test_method,
  mpf.test_condition,
  mpf.temperature_c,
  mpf.load,
  mpf.duration,
  mpf.frequency,
  mpf.direction,
  mpf.specimen,
  mpf.process_type,
  mpf.zone,
  COALESCE(mpf.source_file, msd.source_filename, m.source_file) AS source_file,
  mpf.source_page,
  COALESCE(mpf.source_revision_date, msd.source_revision_date, m.source_revision_date) AS source_revision_date,
  mpf.notes,
  mpf.created_at
FROM material_property_facts mpf
JOIN materials m ON m.id = mpf.material_id
JOIN material_property_definitions mpd ON mpd.id = mpf.property_definition_id
LEFT JOIN material_external_identifiers mei
  ON mei.material_id = m.id
 AND mei.namespace = 'material-master-v1'
LEFT JOIN material_source_documents msd ON msd.id = mpf.source_document_id;

