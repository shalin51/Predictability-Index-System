UPDATE suppliers
SET
  supplier_name = COALESCE(supplier_name, name),
  contact_info = COALESCE(contact_info, contact_email)
WHERE supplier_name IS NULL OR contact_info IS NULL;

UPDATE materials
SET
  material_code = COALESCE(material_code, regexp_replace(upper(name), '[^A-Z0-9]+', '_', 'g')),
  material_name = COALESCE(material_name, name),
  default_unit = COALESCE(default_unit, unit, 'wt%')
WHERE material_code IS NULL OR material_name IS NULL OR default_unit IS NULL;

INSERT INTO roles (role_key, role_name)
VALUES
  ('admin', 'Admin'),
  ('rd_user', 'R&D User'),
  ('lab_technician', 'Lab Technician'),
  ('manager', 'Manager'),
  ('executive', 'Executive')
ON CONFLICT (role_key) DO UPDATE SET role_name = EXCLUDED.role_name;

INSERT INTO suppliers (name, supplier_name, supplier_type)
VALUES
  ('Supplier A', 'Supplier A', 'raw_material'),
  ('Supplier B', 'Supplier B', 'raw_material'),
  ('Supplier C', 'Supplier C', 'raw_material')
ON CONFLICT (name) DO UPDATE
SET supplier_name = EXCLUDED.supplier_name, supplier_type = EXCLUDED.supplier_type;

INSERT INTO materials (name, material_code, material_name, material_type, unit, default_unit)
VALUES
  ('PP7033N', 'PP7033N', 'PP7033N', 'polymer', 'wt%', 'wt%'),
  ('Vistamaxx 6202', 'VISTAMAXX_6202', 'Vistamaxx 6202', 'polymer', 'wt%', 'wt%'),
  ('Additive A', 'ADDITIVE_A', 'Additive A', 'additive', 'wt%', 'wt%'),
  ('Additive B', 'ADDITIVE_B', 'Additive B', 'additive', 'wt%', 'wt%'),
  ('Yellow Masterbatch', 'YELLOW_MASTERBATCH', 'Yellow Masterbatch', 'colorant', 'wt%', 'wt%')
ON CONFLICT (name, material_type) DO UPDATE
SET material_code = EXCLUDED.material_code, material_name = EXCLUDED.material_name, unit = EXCLUDED.unit, default_unit = EXCLUDED.default_unit;

INSERT INTO supplier_materials (supplier_id, material_id, supplier_material_code, status)
SELECT s.id, m.id, mapping.supplier_material_code, 'active'::record_status
FROM (
  VALUES
    ('Supplier A', 'PP7033N', 'SUP-A-PP7033N'),
    ('Supplier A', 'VISTAMAXX_6202', 'SUP-A-VM6202'),
    ('Supplier B', 'ADDITIVE_A', 'SUP-B-ADD-A'),
    ('Supplier B', 'ADDITIVE_B', 'SUP-B-ADD-B'),
    ('Supplier C', 'YELLOW_MASTERBATCH', 'SUP-C-YELLOW')
) AS mapping(supplier_name, material_code, supplier_material_code)
JOIN suppliers s ON s.supplier_name = mapping.supplier_name
JOIN materials m ON m.material_code = mapping.material_code
ON CONFLICT (supplier_id, material_id, supplier_material_code) DO UPDATE SET status = EXCLUDED.status;

INSERT INTO material_lots (supplier_material_id, lot_number, received_date, expiration_date, status)
SELECT sm.id, lot.lot_number, lot.received_date::date, lot.expiration_date::date, 'active'::record_status
FROM (
  VALUES
    ('SUP-A-PP7033N', 'PP-2026-771A', '2026-06-20', NULL),
    ('SUP-A-VM6202', 'VM-2026-118B', '2026-06-22', NULL),
    ('SUP-B-ADD-A', 'ADDA-2026-034', '2026-06-18', '2027-06-18'),
    ('SUP-B-ADD-B', 'ADDB-2026-041', '2026-06-19', '2027-06-19'),
    ('SUP-C-YELLOW', 'YEL-2026-012', '2026-06-21', '2027-06-21')
) AS lot(supplier_material_code, lot_number, received_date, expiration_date)
JOIN supplier_materials sm ON sm.supplier_material_code = lot.supplier_material_code
ON CONFLICT (supplier_material_id, lot_number) DO UPDATE
SET received_date = EXCLUDED.received_date, expiration_date = EXCLUDED.expiration_date, status = EXCLUDED.status;

INSERT INTO machines (machine_code, machine_name)
VALUES ('Machine-01', 'Machine-01'), ('Machine-02', 'Machine-02'), ('Machine-03', 'Machine-03')
ON CONFLICT (machine_code) DO UPDATE SET machine_name = EXCLUDED.machine_name;

INSERT INTO molds (mold_code, mold_name, mold_type)
VALUES ('MOLD-A', 'MOLD-A', 'pickleball'), ('MOLD-B', 'MOLD-B', 'pickleball')
ON CONFLICT (mold_code) DO UPDATE SET mold_name = EXCLUDED.mold_name, mold_type = EXCLUDED.mold_type;

INSERT INTO metric_definitions
  (metric_key, display_name, category, default_unit, data_type, required_for_scoring, higher_is_better, sort_order)
VALUES
  ('weight', 'Weight', 'physical', 'g', 'numeric', true, NULL, 10),
  ('diameter', 'Diameter', 'physical', 'mm', 'numeric', true, NULL, 20),
  ('wall_thickness', 'Wall Thickness', 'physical', 'mm', 'numeric', false, NULL, 30),
  ('roundness', 'Roundness', 'physical', 'mm', 'numeric', true, false, 40),
  ('balance_deviation', 'Balance Deviation', 'physical', 'mm', 'numeric', true, false, 50),
  ('bounce_height', 'Bounce Height', 'performance', 'in', 'numeric', true, true, 60),
  ('hardness', 'Hardness', 'performance', 'Shore D', 'numeric', true, NULL, 70),
  ('compression', 'Compression', 'performance', 'in', 'numeric', true, NULL, 80),
  ('deflection', 'Deflection', 'performance', 'mm', 'numeric', false, NULL, 90),
  ('coefficient_of_restitution', 'Coefficient of Restitution', 'performance', 'ratio', 'numeric', false, true, 100),
  ('air_cannon_cycles_to_failure', 'Air Cannon Cycles to Failure', 'durability', 'cycles', 'numeric', true, true, 110),
  ('crack_initiation_cycles', 'Crack Initiation Cycles', 'durability', 'cycles', 'numeric', true, true, 120),
  ('deformation_measurement', 'Deformation Measurement', 'durability', 'mm', 'numeric', true, false, 130),
  ('hot_temperature_performance', 'Hot Temperature Performance', 'environmental', 'score', 'numeric', false, true, 140),
  ('cold_temperature_performance', 'Cold Temperature Performance', 'environmental', 'score', 'numeric', false, true, 150),
  ('humidity_exposure_result', 'Humidity Exposure Result', 'environmental', 'score', 'numeric', false, true, 160),
  ('feel_rating', 'Feel Rating', 'subjective', '1-10', 'rating', false, true, 170),
  ('sound_rating', 'Sound Rating', 'subjective', '1-10', 'rating', false, true, 180),
  ('perceived_speed', 'Perceived Speed', 'subjective', '1-10', 'rating', false, true, 190),
  ('perceived_durability', 'Perceived Durability', 'subjective', '1-10', 'rating', false, true, 200)
ON CONFLICT (metric_key) DO UPDATE
SET display_name = EXCLUDED.display_name, category = EXCLUDED.category, default_unit = EXCLUDED.default_unit,
    data_type = EXCLUDED.data_type, required_for_scoring = EXCLUDED.required_for_scoring,
    higher_is_better = EXCLUDED.higher_is_better, sort_order = EXCLUDED.sort_order;

INSERT INTO test_method_definitions (method_code, method_name, metric_id, cure_hours)
SELECT upper(metric_key) || '_STANDARD', display_name || ' Standard Method', id, 72
FROM metric_definitions
ON CONFLICT (method_code) DO UPDATE SET method_name = EXCLUDED.method_name, metric_id = EXCLUDED.metric_id, cure_hours = EXCLUDED.cure_hours;

INSERT INTO test_condition_definitions (condition_code, condition_name, description)
VALUES
  ('AMBIENT', 'Ambient', 'Standard lab ambient condition'),
  ('HOT', 'Hot', 'Elevated temperature exposure'),
  ('COLD', 'Cold', 'Low temperature exposure'),
  ('HUMIDITY', 'Humidity', 'Humidity exposure')
ON CONFLICT (condition_code) DO UPDATE SET condition_name = EXCLUDED.condition_name, description = EXCLUDED.description;

INSERT INTO benchmark_profiles
  (id, name, benchmark_code, benchmark_name, profile_version, description, ball_brand, ball_model)
VALUES
  ('a0000001-0000-0000-0000-000000000001', 'Lifetime Pickleball', 'LIFETIME', 'Lifetime Pickleball', 1, 'Lifetime Pickleball benchmark profile', 'Lifetime', 'Pickleball'),
  ('a0000001-0000-0000-0000-000000000002', 'Franklin X-40', 'X40', 'Franklin X-40', 1, 'Franklin X-40 benchmark profile', 'Franklin', 'X-40')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name, benchmark_code = EXCLUDED.benchmark_code, benchmark_name = EXCLUDED.benchmark_name,
    profile_version = EXCLUDED.profile_version, description = EXCLUDED.description,
    ball_brand = EXCLUDED.ball_brand, ball_model = EXCLUDED.ball_model;

WITH targets(benchmark_code, metric_key, target_mean, min_acceptable, max_acceptable, target_std_dev, weight, criticality, required_for_pass) AS (
  VALUES
    ('LIFETIME', 'weight', 26, 24, 28, 0.5, 0.09, 'high', true),
    ('LIFETIME', 'diameter', 74, 73, 75, 0.3, 0.10, 'critical', true),
    ('LIFETIME', 'roundness', 0.3, 0, 0.5, 0.1, 0.09, 'high', true),
    ('LIFETIME', 'balance_deviation', 0.5, 0, 1, 0.2, 0.08, 'medium', true),
    ('LIFETIME', 'bounce_height', 26.77, 25.2, 28.35, 0.79, 0.13, 'critical', true),
    ('LIFETIME', 'hardness', 48, 44, 52, 2, 0.11, 'high', true),
    ('LIFETIME', 'compression', 1.65, 1.5, 1.81, 0.08, 0.09, 'high', true),
    ('LIFETIME', 'air_cannon_cycles_to_failure', 2000, 1500, 3000, 200, 0.12, 'high', true),
    ('LIFETIME', 'crack_initiation_cycles', 1800, 1200, 2500, 200, 0.10, 'high', true),
    ('LIFETIME', 'deformation_measurement', 1, 0, 2, 0.3, 0.09, 'high', true),
    ('X40', 'weight', 25.5, 24, 27.5, 0.4, 0.09, 'high', true),
    ('X40', 'diameter', 74, 73, 75, 0.3, 0.10, 'critical', true),
    ('X40', 'roundness', 0.25, 0, 0.5, 0.1, 0.09, 'high', true),
    ('X40', 'balance_deviation', 0.4, 0, 0.9, 0.2, 0.08, 'medium', true),
    ('X40', 'bounce_height', 27.56, 25.98, 29.13, 0.79, 0.13, 'critical', true),
    ('X40', 'hardness', 50, 46, 54, 2, 0.11, 'high', true),
    ('X40', 'compression', 1.73, 1.57, 1.89, 0.08, 0.09, 'high', true),
    ('X40', 'air_cannon_cycles_to_failure', 2200, 1600, 3200, 200, 0.12, 'high', true),
    ('X40', 'crack_initiation_cycles', 2000, 1400, 2800, 200, 0.10, 'high', true),
    ('X40', 'deformation_measurement', 0.9, 0, 1.8, 0.3, 0.09, 'high', true)
)
INSERT INTO benchmark_metric_targets
  (benchmark_id, benchmark_profile_id, metric_name, metric_category, metric_id, target_value, target_mean,
   min_acceptable, max_acceptable, standard_deviation, target_std_dev, weight, criticality, unit, required_for_pass)
SELECT bp.id, bp.id, md.metric_key, md.category::text, md.id, t.target_mean, t.target_mean,
       t.min_acceptable, t.max_acceptable, t.target_std_dev, t.target_std_dev,
       t.weight, t.criticality, md.default_unit, t.required_for_pass
FROM targets t
JOIN benchmark_profiles bp ON bp.benchmark_code = t.benchmark_code
JOIN metric_definitions md ON md.metric_key = t.metric_key
ON CONFLICT (benchmark_id, metric_name) DO UPDATE
SET benchmark_profile_id = EXCLUDED.benchmark_profile_id, metric_category = EXCLUDED.metric_category,
    metric_id = EXCLUDED.metric_id, target_value = EXCLUDED.target_value, target_mean = EXCLUDED.target_mean,
    min_acceptable = EXCLUDED.min_acceptable, max_acceptable = EXCLUDED.max_acceptable,
    standard_deviation = EXCLUDED.standard_deviation, target_std_dev = EXCLUDED.target_std_dev,
    weight = EXCLUDED.weight, criticality = EXCLUDED.criticality, unit = EXCLUDED.unit,
    required_for_pass = EXCLUDED.required_for_pass;

INSERT INTO algorithm_versions (algorithm_code, algorithm_name, version, description, config)
VALUES ('PERFORMANCE_DISTANCE', 'Performance Distance Score', '1.0', 'Baseline weighted distance scoring algorithm.', '{"normalization":"target_range"}'::jsonb)
ON CONFLICT (algorithm_code, version) DO UPDATE
SET algorithm_name = EXCLUDED.algorithm_name, description = EXCLUDED.description, config = EXCLUDED.config;
