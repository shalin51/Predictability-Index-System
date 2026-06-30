-- ============================================================
-- Seed: Sample Formulations + test data (dev/staging only)
-- ============================================================

INSERT INTO suppliers (id, name)
VALUES
('b0000001-0000-0000-0000-000000000001', 'PolymerCo Inc'),
('b0000001-0000-0000-0000-000000000002', 'ChemSolutions Ltd')
ON CONFLICT (id) DO NOTHING;

INSERT INTO materials (id, name, material_type, supplier_id, unit)
VALUES
('c0000001-0000-0000-0000-000000000001', 'HDPE Resin Grade A', 'polymer', 'b0000001-0000-0000-0000-000000000001', 'kg'),
('c0000001-0000-0000-0000-000000000002', 'UV Stabilizer X12', 'additive', 'b0000001-0000-0000-0000-000000000002', 'g'),
('c0000001-0000-0000-0000-000000000003', 'Impact Modifier B7', 'additive', 'b0000001-0000-0000-0000-000000000001', 'kg'),
('c0000001-0000-0000-0000-000000000004', 'Color Pigment White', 'colorant', 'b0000001-0000-0000-0000-000000000002', 'g')
ON CONFLICT (id) DO NOTHING;

INSERT INTO formulations (id, formulation_code, name, description, status, produced_date, lot_number, batch_size_kg)
VALUES
(
  'd0000001-0000-0000-0000-000000000001',
  'FORM-001-A',
  'Standard HDPE Blend v1',
  'Initial test formulation for outdoor performance',
  'testing',
  '2026-06-01',
  'LOT-2026-001',
  50.0
),
(
  'd0000001-0000-0000-0000-000000000002',
  'FORM-002-A',
  'High-Performance Blend v1',
  'Optimised for bounce and durability metrics',
  'testing',
  '2026-06-10',
  'LOT-2026-002',
  50.0
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO formulation_materials (formulation_id, material_id, percentage)
VALUES
('d0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 88.0),
('d0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000002', 0.5),
('d0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000003', 8.0),
('d0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000004', 3.5),
('d0000001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000001', 85.0),
('d0000001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000002', 0.5),
('d0000001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000003', 11.0),
('d0000001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000004', 3.5)
ON CONFLICT (formulation_id, material_id) DO NOTHING;

INSERT INTO test_results (formulation_id, weight_g, diameter_mm, wall_thickness_mm, roundness_mm, balance_g, bounce_cm, hardness_shore_d, compression_kg, deflection_mm, coefficient_of_restitution)
SELECT
  'd0000001-0000-0000-0000-000000000001',
  26.1, 74.1, 2.5, 0.3, 0.45, 67.5, 47.5, 41.0, 5.1, 0.81
WHERE NOT EXISTS (
  SELECT 1 FROM test_results WHERE formulation_id = 'd0000001-0000-0000-0000-000000000001'
);

INSERT INTO durability_results (formulation_id, air_cannon_cycles, crack_initiation_cycles, crack_propagation_mm, deformation_mm)
SELECT
  'd0000001-0000-0000-0000-000000000001',
  1950, 1750, 2.2, 1.1
WHERE NOT EXISTS (
  SELECT 1 FROM durability_results WHERE formulation_id = 'd0000001-0000-0000-0000-000000000001'
);

INSERT INTO environmental_results (formulation_id, hot_performance_score, cold_performance_score, humidity_performance_score, test_temp_hot_c, test_temp_cold_c, test_humidity_pct)
SELECT
  'd0000001-0000-0000-0000-000000000001',
  83.0, 78.0, 80.0, 50.0, -5.0, 85.0
WHERE NOT EXISTS (
  SELECT 1 FROM environmental_results WHERE formulation_id = 'd0000001-0000-0000-0000-000000000001'
);

INSERT INTO subjective_ratings (formulation_id, feel_score, sound_score, perceived_speed_score, perceived_durability_score)
SELECT
  'd0000001-0000-0000-0000-000000000001',
  7, 7, 7, 7
WHERE NOT EXISTS (
  SELECT 1 FROM subjective_ratings WHERE formulation_id = 'd0000001-0000-0000-0000-000000000001'
);

INSERT INTO test_results (formulation_id, weight_g, diameter_mm, wall_thickness_mm, roundness_mm, balance_g, bounce_cm, hardness_shore_d, compression_kg, deflection_mm, coefficient_of_restitution)
SELECT
  'd0000001-0000-0000-0000-000000000002',
  25.8, 74.0, 2.4, 0.25, 0.35, 70.0, 50.0, 43.5, 4.9, 0.83
WHERE NOT EXISTS (
  SELECT 1 FROM test_results WHERE formulation_id = 'd0000001-0000-0000-0000-000000000002'
);

INSERT INTO durability_results (formulation_id, air_cannon_cycles, crack_initiation_cycles, crack_propagation_mm, deformation_mm)
SELECT
  'd0000001-0000-0000-0000-000000000002',
  2200, 2000, 1.9, 0.9
WHERE NOT EXISTS (
  SELECT 1 FROM durability_results WHERE formulation_id = 'd0000001-0000-0000-0000-000000000002'
);

INSERT INTO environmental_results (formulation_id, hot_performance_score, cold_performance_score, humidity_performance_score, test_temp_hot_c, test_temp_cold_c, test_humidity_pct)
SELECT
  'd0000001-0000-0000-0000-000000000002',
  87.0, 82.0, 84.0, 50.0, -5.0, 85.0
WHERE NOT EXISTS (
  SELECT 1 FROM environmental_results WHERE formulation_id = 'd0000001-0000-0000-0000-000000000002'
);

INSERT INTO subjective_ratings (formulation_id, feel_score, sound_score, perceived_speed_score, perceived_durability_score)
SELECT
  'd0000001-0000-0000-0000-000000000002',
  8, 8, 8, 8
WHERE NOT EXISTS (
  SELECT 1 FROM subjective_ratings WHERE formulation_id = 'd0000001-0000-0000-0000-000000000002'
);
