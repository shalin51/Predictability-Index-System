-- Migration 020: Remove only the legacy demo material catalog records.
-- Workbook-backed MAT-001 through MAT-017 and SUP-001 through SUP-008 remain.

WITH replacements(component_id, material_code, supplier_name) AS (
  VALUES
    ('44000001-0000-0000-0000-000000000001'::uuid, 'MAT-008', 'ExxonMobil'),
    ('44000001-0000-0000-0000-000000000002'::uuid, 'MAT-002', 'ExxonMobil'),
    ('44000001-0000-0000-0000-000000000003'::uuid, 'MAT-005', 'Dow'),
    ('44000001-0000-0000-0000-000000000004'::uuid, 'MAT-006', 'Dow'),
    ('44000001-0000-0000-0000-000000000005'::uuid, 'MAT-003', 'ExxonMobil'),
    ('44000001-0000-0000-0000-000000000006'::uuid, 'MAT-008', 'ExxonMobil'),
    ('44000001-0000-0000-0000-000000000007'::uuid, 'MAT-002', 'ExxonMobil'),
    ('44000001-0000-0000-0000-000000000008'::uuid, 'MAT-005', 'Dow'),
    ('44000001-0000-0000-0000-000000000009'::uuid, 'MAT-006', 'Dow'),
    ('44000001-0000-0000-0000-000000000010'::uuid, 'MAT-003', 'ExxonMobil'),
    ('44000001-0000-0000-0000-000000000011'::uuid, 'MAT-008', 'ExxonMobil'),
    ('44000001-0000-0000-0000-000000000012'::uuid, 'MAT-002', 'ExxonMobil'),
    ('44000001-0000-0000-0000-000000000013'::uuid, 'MAT-005', 'Dow'),
    ('44000001-0000-0000-0000-000000000014'::uuid, 'MAT-006', 'Dow'),
    ('44000001-0000-0000-0000-000000000015'::uuid, 'MAT-003', 'ExxonMobil')
)
UPDATE formulation_components fc
SET material_id = m.id,
    supplier_id = s.id,
    material_lot_id = NULL,
    updated_at = now()
FROM replacements r
JOIN materials m ON m.material_code = r.material_code
JOIN suppliers s ON s.supplier_name = r.supplier_name
WHERE fc.id = r.component_id;

DELETE FROM material_lots ml
USING supplier_materials sm
WHERE ml.supplier_material_id = sm.id
  AND sm.supplier_material_code IN (
    'SUP-A-PP7033N',
    'SUP-A-VM6202',
    'SUP-B-ADD-A',
    'SUP-B-ADD-B',
    'SUP-C-YELLOW'
  );

DELETE FROM supplier_materials
WHERE supplier_material_code IN (
  'SUP-A-PP7033N',
  'SUP-A-VM6202',
  'SUP-B-ADD-A',
  'SUP-B-ADD-B',
  'SUP-C-YELLOW'
);

DELETE FROM materials
WHERE id IN (
    'c0000001-0000-0000-0000-000000000001'::uuid,
    'c0000001-0000-0000-0000-000000000002'::uuid,
    'c0000001-0000-0000-0000-000000000003'::uuid,
    'c0000001-0000-0000-0000-000000000004'::uuid
  )
   OR material_code IN ('PP7033N', 'ADDITIVE_A', 'ADDITIVE_B', 'YELLOW_MASTERBATCH');

DELETE FROM suppliers
WHERE id IN (
    'b0000001-0000-0000-0000-000000000001'::uuid,
    'b0000001-0000-0000-0000-000000000002'::uuid
  )
   OR name IN ('Supplier A', 'Supplier B', 'Supplier C');

