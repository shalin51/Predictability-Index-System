-- ============================================================
-- Seed: Benchmark Profiles
-- Lifetime Pickleball and Franklin X-40 reference data
-- ============================================================

INSERT INTO benchmark_profiles (id, name, description, ball_brand, ball_model)
VALUES
(
  'a0000001-0000-0000-0000-000000000001',
  'Lifetime Outdoor',
  'Lifetime Outdoor Pickleball — primary benchmark for outdoor play performance',
  'Lifetime',
  'Outdoor Pickleball'
),
(
  'a0000001-0000-0000-0000-000000000002',
  'Franklin X-40',
  'Franklin Sports X-40 Performance Pickleball — USAPA approved tournament ball',
  'Franklin Sports',
  'X-40 Performance'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO benchmark_metric_targets
  (benchmark_id, metric_name, metric_category, target_value, min_acceptable, max_acceptable, standard_deviation, weight, criticality, unit)
VALUES
('a0000001-0000-0000-0000-000000000001', 'weight', 'physical', 26.0, 24.0, 28.0, 0.5, 0.80, 'high', 'g'),
('a0000001-0000-0000-0000-000000000001', 'diameter', 'physical', 74.0, 73.0, 75.0, 0.3, 0.90, 'critical', 'mm'),
('a0000001-0000-0000-0000-000000000001', 'wall_thickness', 'physical', 2.5, 2.2, 2.8, 0.1, 0.75, 'high', 'mm'),
('a0000001-0000-0000-0000-000000000001', 'roundness', 'physical', 0.3, 0.0, 0.5, 0.1, 0.70, 'normal', 'mm'),
('a0000001-0000-0000-0000-000000000001', 'balance', 'physical', 0.5, 0.0, 1.0, 0.2, 0.65, 'normal', 'g'),
('a0000001-0000-0000-0000-000000000001', 'bounce', 'performance', 68.0, 64.0, 72.0, 2.0, 0.95, 'critical', 'cm'),
('a0000001-0000-0000-0000-000000000001', 'hardness', 'performance', 48.0, 44.0, 52.0, 2.0, 0.90, 'high', 'Shore D'),
('a0000001-0000-0000-0000-000000000001', 'compression', 'performance', 42.0, 38.0, 46.0, 2.0, 0.85, 'high', 'kg'),
('a0000001-0000-0000-0000-000000000001', 'deflection', 'performance', 5.0, 4.0, 6.0, 0.5, 0.80, 'high', 'mm'),
('a0000001-0000-0000-0000-000000000001', 'coefficient_of_restitution', 'performance', 0.82, 0.78, 0.86, 0.02, 0.90, 'critical', NULL),
('a0000001-0000-0000-0000-000000000001', 'air_cannon_cycles', 'durability', 2000, 1500, 3000, 200, 0.85, 'high', 'cycles'),
('a0000001-0000-0000-0000-000000000001', 'crack_initiation_cycles', 'durability', 1800, 1200, 2500, 200, 0.85, 'high', 'cycles'),
('a0000001-0000-0000-0000-000000000001', 'crack_propagation', 'durability', 2.0, 0.0, 4.0, 0.5, 0.80, 'high', 'mm'),
('a0000001-0000-0000-0000-000000000001', 'deformation', 'durability', 1.0, 0.0, 2.0, 0.3, 0.75, 'high', 'mm'),
('a0000001-0000-0000-0000-000000000001', 'hot_performance', 'environmental', 85.0, 75.0, 100.0, 5.0, 0.80, 'high', 'score'),
('a0000001-0000-0000-0000-000000000001', 'cold_performance', 'environmental', 80.0, 70.0, 100.0, 5.0, 0.80, 'high', 'score'),
('a0000001-0000-0000-0000-000000000001', 'humidity_performance', 'environmental', 82.0, 72.0, 100.0, 5.0, 0.75, 'normal', 'score'),
('a0000001-0000-0000-0000-000000000001', 'feel', 'subjective', 7.5, 6.0, 10.0, 1.0, 0.70, 'normal', '1-10'),
('a0000001-0000-0000-0000-000000000001', 'sound', 'subjective', 7.0, 5.5, 10.0, 1.0, 0.60, 'low', '1-10'),
('a0000001-0000-0000-0000-000000000001', 'perceived_speed', 'subjective', 7.0, 6.0, 10.0, 1.0, 0.65, 'normal', '1-10'),
('a0000001-0000-0000-0000-000000000001', 'perceived_durability', 'subjective', 7.5, 6.0, 10.0, 1.0, 0.70, 'normal', '1-10'),
('a0000001-0000-0000-0000-000000000002', 'weight', 'physical', 25.5, 24.0, 27.5, 0.4, 0.80, 'high', 'g'),
('a0000001-0000-0000-0000-000000000002', 'diameter', 'physical', 74.0, 73.0, 75.0, 0.3, 0.90, 'critical', 'mm'),
('a0000001-0000-0000-0000-000000000002', 'wall_thickness', 'physical', 2.4, 2.1, 2.7, 0.1, 0.75, 'high', 'mm'),
('a0000001-0000-0000-0000-000000000002', 'roundness', 'physical', 0.25, 0.0, 0.5, 0.1, 0.70, 'normal', 'mm'),
('a0000001-0000-0000-0000-000000000002', 'balance', 'physical', 0.4, 0.0, 0.9, 0.2, 0.65, 'normal', 'g'),
('a0000001-0000-0000-0000-000000000002', 'bounce', 'performance', 70.0, 66.0, 74.0, 2.0, 0.95, 'critical', 'cm'),
('a0000001-0000-0000-0000-000000000002', 'hardness', 'performance', 50.0, 46.0, 54.0, 2.0, 0.90, 'high', 'Shore D'),
('a0000001-0000-0000-0000-000000000002', 'compression', 'performance', 44.0, 40.0, 48.0, 2.0, 0.85, 'high', 'kg'),
('a0000001-0000-0000-0000-000000000002', 'deflection', 'performance', 4.8, 3.8, 5.8, 0.4, 0.80, 'high', 'mm'),
('a0000001-0000-0000-0000-000000000002', 'coefficient_of_restitution', 'performance', 0.83, 0.79, 0.87, 0.02, 0.90, 'critical', NULL),
('a0000001-0000-0000-0000-000000000002', 'air_cannon_cycles', 'durability', 2200, 1600, 3200, 200, 0.85, 'high', 'cycles'),
('a0000001-0000-0000-0000-000000000002', 'crack_initiation_cycles', 'durability', 2000, 1400, 2800, 200, 0.85, 'high', 'cycles'),
('a0000001-0000-0000-0000-000000000002', 'crack_propagation', 'durability', 1.8, 0.0, 3.5, 0.4, 0.80, 'high', 'mm'),
('a0000001-0000-0000-0000-000000000002', 'deformation', 'durability', 0.9, 0.0, 1.8, 0.3, 0.75, 'high', 'mm'),
('a0000001-0000-0000-0000-000000000002', 'hot_performance', 'environmental', 88.0, 78.0, 100.0, 5.0, 0.80, 'high', 'score'),
('a0000001-0000-0000-0000-000000000002', 'cold_performance', 'environmental', 83.0, 73.0, 100.0, 5.0, 0.80, 'high', 'score'),
('a0000001-0000-0000-0000-000000000002', 'humidity_performance', 'environmental', 85.0, 75.0, 100.0, 5.0, 0.75, 'normal', 'score'),
('a0000001-0000-0000-0000-000000000002', 'feel', 'subjective', 8.0, 6.5, 10.0, 1.0, 0.70, 'normal', '1-10'),
('a0000001-0000-0000-0000-000000000002', 'sound', 'subjective', 7.5, 6.0, 10.0, 1.0, 0.60, 'low', '1-10'),
('a0000001-0000-0000-0000-000000000002', 'perceived_speed', 'subjective', 7.5, 6.5, 10.0, 1.0, 0.65, 'normal', '1-10'),
('a0000001-0000-0000-0000-000000000002', 'perceived_durability', 'subjective', 8.0, 6.5, 10.0, 1.0, 0.70, 'normal', '1-10')
ON CONFLICT (benchmark_id, metric_name) DO NOTHING;
