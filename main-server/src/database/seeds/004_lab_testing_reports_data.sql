-- Demo workflow data for the Lab Testing and Reports modules.

INSERT INTO app_users (id, email, full_name)
VALUES ('40000001-0000-0000-0000-000000000001', 'lab.team@example.com', 'Lab Team')
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, full_name = EXCLUDED.full_name;

INSERT INTO experiments (id, experiment_code, experiment_name)
VALUES ('41000001-0000-0000-0000-000000000001', 'EXP-2026-Q3', 'Q3 Pickleball Performance Trial')
ON CONFLICT (id) DO UPDATE SET experiment_code = EXCLUDED.experiment_code, experiment_name = EXCLUDED.experiment_name;

INSERT INTO formulation_families (id, family_name)
VALUES ('42000001-0000-0000-0000-000000000001', 'Performance Pickleball')
ON CONFLICT (id) DO UPDATE SET family_name = EXCLUDED.family_name;

INSERT INTO formulations (id, formulation_code, version_no, experiment_id, family_id, target_benchmark_id, status, notes)
VALUES
  ('43000001-0000-0000-0000-000000000001', 'PB-2607-A', 1, '41000001-0000-0000-0000-000000000001', '42000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000002', 'scored', 'Balanced baseline formulation for X-40 comparison.'),
  ('43000001-0000-0000-0000-000000000002', 'PB-2607-B', 1, '41000001-0000-0000-0000-000000000001', '42000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000002', 'testing', 'Higher elastomer content under active lab evaluation.'),
  ('43000001-0000-0000-0000-000000000003', 'PB-2607-C', 1, '41000001-0000-0000-0000-000000000001', '42000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'molded', 'Durability-focused variant awaiting lab intake.')
ON CONFLICT (id) DO UPDATE SET
  formulation_code = EXCLUDED.formulation_code, version_no = EXCLUDED.version_no,
  experiment_id = EXCLUDED.experiment_id, family_id = EXCLUDED.family_id,
  target_benchmark_id = EXCLUDED.target_benchmark_id, status = EXCLUDED.status, notes = EXCLUDED.notes;

WITH component_data (id, formulation_id, material_code, supplier_name, lot_number, percent_composition, sort_order) AS (
  VALUES
    ('44000001-0000-0000-0000-000000000001'::uuid, '43000001-0000-0000-0000-000000000001'::uuid, 'PP7033N', 'Supplier A', 'PP-2026-771A', 76.0, 10),
    ('44000001-0000-0000-0000-000000000002'::uuid, '43000001-0000-0000-0000-000000000001'::uuid, 'VISTAMAXX_6202', 'Supplier A', 'VM-2026-118B', 16.0, 20),
    ('44000001-0000-0000-0000-000000000003'::uuid, '43000001-0000-0000-0000-000000000001'::uuid, 'ADDITIVE_A', 'Supplier B', 'ADDA-2026-034', 4.0, 30),
    ('44000001-0000-0000-0000-000000000004'::uuid, '43000001-0000-0000-0000-000000000001'::uuid, 'ADDITIVE_B', 'Supplier B', 'ADDB-2026-041', 2.0, 40),
    ('44000001-0000-0000-0000-000000000005'::uuid, '43000001-0000-0000-0000-000000000001'::uuid, 'YELLOW_MASTERBATCH', 'Supplier C', 'YEL-2026-012', 2.0, 50),
    ('44000001-0000-0000-0000-000000000006'::uuid, '43000001-0000-0000-0000-000000000002'::uuid, 'PP7033N', 'Supplier A', 'PP-2026-771A', 72.0, 10),
    ('44000001-0000-0000-0000-000000000007'::uuid, '43000001-0000-0000-0000-000000000002'::uuid, 'VISTAMAXX_6202', 'Supplier A', 'VM-2026-118B', 20.0, 20),
    ('44000001-0000-0000-0000-000000000008'::uuid, '43000001-0000-0000-0000-000000000002'::uuid, 'ADDITIVE_A', 'Supplier B', 'ADDA-2026-034', 4.0, 30),
    ('44000001-0000-0000-0000-000000000009'::uuid, '43000001-0000-0000-0000-000000000002'::uuid, 'ADDITIVE_B', 'Supplier B', 'ADDB-2026-041', 2.0, 40),
    ('44000001-0000-0000-0000-000000000010'::uuid, '43000001-0000-0000-0000-000000000002'::uuid, 'YELLOW_MASTERBATCH', 'Supplier C', 'YEL-2026-012', 2.0, 50),
    ('44000001-0000-0000-0000-000000000011'::uuid, '43000001-0000-0000-0000-000000000003'::uuid, 'PP7033N', 'Supplier A', 'PP-2026-771A', 78.0, 10),
    ('44000001-0000-0000-0000-000000000012'::uuid, '43000001-0000-0000-0000-000000000003'::uuid, 'VISTAMAXX_6202', 'Supplier A', 'VM-2026-118B', 14.0, 20),
    ('44000001-0000-0000-0000-000000000013'::uuid, '43000001-0000-0000-0000-000000000003'::uuid, 'ADDITIVE_A', 'Supplier B', 'ADDA-2026-034', 4.0, 30),
    ('44000001-0000-0000-0000-000000000014'::uuid, '43000001-0000-0000-0000-000000000003'::uuid, 'ADDITIVE_B', 'Supplier B', 'ADDB-2026-041', 2.0, 40),
    ('44000001-0000-0000-0000-000000000015'::uuid, '43000001-0000-0000-0000-000000000003'::uuid, 'YELLOW_MASTERBATCH', 'Supplier C', 'YEL-2026-012', 2.0, 50)
)
INSERT INTO formulation_components (id, formulation_id, material_id, supplier_id, material_lot_id, percent_composition, sort_order)
SELECT d.id, d.formulation_id, m.id, s.id, ml.id, d.percent_composition, d.sort_order
FROM component_data d
JOIN materials m ON m.material_code = d.material_code
JOIN suppliers s ON s.supplier_name = d.supplier_name
LEFT JOIN material_lots ml ON ml.lot_number = d.lot_number
ON CONFLICT (id) DO UPDATE SET
  formulation_id = EXCLUDED.formulation_id, material_id = EXCLUDED.material_id,
  supplier_id = EXCLUDED.supplier_id, material_lot_id = EXCLUDED.material_lot_id,
  percent_composition = EXCLUDED.percent_composition, sort_order = EXCLUDED.sort_order;

WITH run_data (id, run_code, formulation_id, date_produced, machine_code, mold_code, injection_pressure, melt_temperature, cooling_time, cycle_time, cure_hours_before_test, status) AS (
  VALUES
    ('45000001-0000-0000-0000-000000000001'::uuid, 'RUN-260701-A', '43000001-0000-0000-0000-000000000001'::uuid, '2026-07-01'::date, 'Machine-01', 'MOLD-A', 920.0, 218.0, 18.0, 42.0, 72.0, 'scored'::production_run_status),
    ('45000001-0000-0000-0000-000000000002'::uuid, 'RUN-260708-B', '43000001-0000-0000-0000-000000000002'::uuid, '2026-07-08'::date, 'Machine-02', 'MOLD-A', 940.0, 221.0, 19.0, 43.0, 72.0, 'testing'::production_run_status),
    ('45000001-0000-0000-0000-000000000003'::uuid, 'RUN-260710-C', '43000001-0000-0000-0000-000000000003'::uuid, '2026-07-10'::date, 'Machine-03', 'MOLD-B', 910.0, 216.0, 18.0, 41.0, 72.0, 'ready_for_testing'::production_run_status)
)
INSERT INTO production_runs (id, run_code, formulation_id, date_produced, machine_id, mold_id, injection_pressure, melt_temperature, cooling_time, cycle_time, cure_hours_before_test, status)
SELECT d.id, d.run_code, d.formulation_id, d.date_produced, ma.id, mo.id, d.injection_pressure, d.melt_temperature, d.cooling_time, d.cycle_time, d.cure_hours_before_test, d.status
FROM run_data d
JOIN machines ma ON ma.machine_code = d.machine_code
JOIN molds mo ON mo.mold_code = d.mold_code
ON CONFLICT (id) DO UPDATE SET
  run_code = EXCLUDED.run_code, formulation_id = EXCLUDED.formulation_id, date_produced = EXCLUDED.date_produced,
  machine_id = EXCLUDED.machine_id, mold_id = EXCLUDED.mold_id, injection_pressure = EXCLUDED.injection_pressure,
  melt_temperature = EXCLUDED.melt_temperature, cooling_time = EXCLUDED.cooling_time, cycle_time = EXCLUDED.cycle_time,
  cure_hours_before_test = EXCLUDED.cure_hours_before_test, status = EXCLUDED.status;

WITH sample_data (id, production_run_id, sample_code, cavity_number, status) AS (
  VALUES
    ('46000001-0000-0000-0000-000000000001'::uuid, '45000001-0000-0000-0000-000000000001'::uuid, 'PB-A-01', 1, 'tested'::sample_status),
    ('46000001-0000-0000-0000-000000000002'::uuid, '45000001-0000-0000-0000-000000000001'::uuid, 'PB-A-02', 2, 'tested'::sample_status),
    ('46000001-0000-0000-0000-000000000003'::uuid, '45000001-0000-0000-0000-000000000001'::uuid, 'PB-A-03', 3, 'tested'::sample_status),
    ('46000001-0000-0000-0000-000000000004'::uuid, '45000001-0000-0000-0000-000000000001'::uuid, 'PB-A-04', 4, 'tested'::sample_status),
    ('46000001-0000-0000-0000-000000000005'::uuid, '45000001-0000-0000-0000-000000000002'::uuid, 'PB-B-01', 1, 'testing'::sample_status),
    ('46000001-0000-0000-0000-000000000006'::uuid, '45000001-0000-0000-0000-000000000002'::uuid, 'PB-B-02', 2, 'testing'::sample_status),
    ('46000001-0000-0000-0000-000000000007'::uuid, '45000001-0000-0000-0000-000000000002'::uuid, 'PB-B-03', 3, 'testing'::sample_status),
    ('46000001-0000-0000-0000-000000000008'::uuid, '45000001-0000-0000-0000-000000000003'::uuid, 'PB-C-01', 1, 'created'::sample_status),
    ('46000001-0000-0000-0000-000000000009'::uuid, '45000001-0000-0000-0000-000000000003'::uuid, 'PB-C-02', 2, 'created'::sample_status),
    ('46000001-0000-0000-0000-000000000010'::uuid, '45000001-0000-0000-0000-000000000003'::uuid, 'PB-C-03', 3, 'created'::sample_status)
)
INSERT INTO samples (id, production_run_id, sample_code, cavity_number, status)
SELECT id, production_run_id, sample_code, cavity_number, status FROM sample_data
ON CONFLICT (id) DO UPDATE SET production_run_id = EXCLUDED.production_run_id, sample_code = EXCLUDED.sample_code, cavity_number = EXCLUDED.cavity_number, status = EXCLUDED.status;

WITH result_values (sample_code, metric_key, value_numeric) AS (
  VALUES
    ('PB-A-01', 'weight', 25.60), ('PB-A-01', 'diameter', 74.00), ('PB-A-01', 'roundness', 0.24), ('PB-A-01', 'balance_deviation', 0.38), ('PB-A-01', 'bounce_height', 27.40), ('PB-A-01', 'hardness', 49.00), ('PB-A-01', 'compression', 1.70), ('PB-A-01', 'air_cannon_cycles_to_failure', 2180), ('PB-A-01', 'crack_initiation_cycles', 1960), ('PB-A-01', 'deformation_measurement', 0.84),
    ('PB-A-02', 'weight', 25.70), ('PB-A-02', 'diameter', 74.10), ('PB-A-02', 'roundness', 0.22), ('PB-A-02', 'balance_deviation', 0.41), ('PB-A-02', 'bounce_height', 27.60), ('PB-A-02', 'hardness', 50.00), ('PB-A-02', 'compression', 1.72), ('PB-A-02', 'air_cannon_cycles_to_failure', 2240), ('PB-A-02', 'crack_initiation_cycles', 2030), ('PB-A-02', 'deformation_measurement', 0.80),
    ('PB-A-03', 'weight', 25.50), ('PB-A-03', 'diameter', 73.90), ('PB-A-03', 'roundness', 0.26), ('PB-A-03', 'balance_deviation', 0.37), ('PB-A-03', 'bounce_height', 27.50), ('PB-A-03', 'hardness', 49.00), ('PB-A-03', 'compression', 1.71), ('PB-A-03', 'air_cannon_cycles_to_failure', 2210), ('PB-A-03', 'crack_initiation_cycles', 1990), ('PB-A-03', 'deformation_measurement', 0.87),
    ('PB-A-04', 'weight', 25.60), ('PB-A-04', 'diameter', 74.00), ('PB-A-04', 'roundness', 0.23), ('PB-A-04', 'balance_deviation', 0.40), ('PB-A-04', 'bounce_height', 27.55), ('PB-A-04', 'hardness', 50.00), ('PB-A-04', 'compression', 1.73), ('PB-A-04', 'air_cannon_cycles_to_failure', 2190), ('PB-A-04', 'crack_initiation_cycles', 2010), ('PB-A-04', 'deformation_measurement', 0.82),
    ('PB-B-01', 'weight', 25.80), ('PB-B-01', 'diameter', 74.00), ('PB-B-01', 'roundness', 0.30), ('PB-B-01', 'bounce_height', 27.90), ('PB-B-01', 'hardness', 47.00), ('PB-B-01', 'compression', 1.78),
    ('PB-B-02', 'weight', 25.90), ('PB-B-02', 'diameter', 74.10), ('PB-B-02', 'roundness', 0.29), ('PB-B-02', 'bounce_height', 27.80), ('PB-B-02', 'hardness', 47.00), ('PB-B-02', 'compression', 1.79),
    ('PB-B-03', 'weight', 25.70), ('PB-B-03', 'diameter', 74.00), ('PB-B-03', 'roundness', 0.31), ('PB-B-03', 'bounce_height', 27.95), ('PB-B-03', 'hardness', 48.00), ('PB-B-03', 'compression', 1.77)
)
INSERT INTO sample_test_results (sample_id, metric_id, test_method_id, value_numeric, unit, tested_by, tested_at, updated_at)
SELECT s.id, md.id, tm.id, v.value_numeric, md.default_unit, 'Lab Team', '2026-07-11T14:00:00Z'::timestamptz, '2026-07-11T14:00:00Z'::timestamptz
FROM result_values v
JOIN samples s ON s.sample_code = v.sample_code
JOIN metric_definitions md ON md.metric_key = v.metric_key
JOIN test_method_definitions tm ON tm.metric_id = md.id AND tm.status = 'active'
ON CONFLICT (sample_id, metric_id, test_method_id) DO UPDATE SET
  value_numeric = EXCLUDED.value_numeric, unit = EXCLUDED.unit, tested_by = EXCLUDED.tested_by, tested_at = EXCLUDED.tested_at, updated_at = EXCLUDED.updated_at;

WITH environmental_values (sample_code, metric_key, condition_code, value_numeric) AS (
  VALUES
    ('PB-A-01', 'hot_temperature_performance', 'HOT', 8.40), ('PB-A-01', 'cold_temperature_performance', 'COLD', 8.10), ('PB-A-01', 'humidity_exposure_result', 'HUMIDITY', 8.30),
    ('PB-A-02', 'hot_temperature_performance', 'HOT', 8.60), ('PB-A-02', 'cold_temperature_performance', 'COLD', 8.00), ('PB-A-02', 'humidity_exposure_result', 'HUMIDITY', 8.40),
    ('PB-A-03', 'hot_temperature_performance', 'HOT', 8.50), ('PB-A-03', 'cold_temperature_performance', 'COLD', 8.20), ('PB-A-03', 'humidity_exposure_result', 'HUMIDITY', 8.20),
    ('PB-A-04', 'hot_temperature_performance', 'HOT', 8.50), ('PB-A-04', 'cold_temperature_performance', 'COLD', 8.10), ('PB-A-04', 'humidity_exposure_result', 'HUMIDITY', 8.30)
)
INSERT INTO environmental_test_results (sample_id, metric_id, test_condition_id, test_method_id, value_numeric, unit, tested_by, tested_at, updated_at)
SELECT s.id, md.id, tc.id, tm.id, v.value_numeric, md.default_unit, 'Lab Team', '2026-07-11T15:00:00Z'::timestamptz, '2026-07-11T15:00:00Z'::timestamptz
FROM environmental_values v
JOIN samples s ON s.sample_code = v.sample_code
JOIN metric_definitions md ON md.metric_key = v.metric_key
JOIN test_condition_definitions tc ON tc.condition_code = v.condition_code
JOIN test_method_definitions tm ON tm.metric_id = md.id AND tm.status = 'active'
ON CONFLICT (sample_id, metric_id, test_condition_id, test_method_id) DO UPDATE SET
  value_numeric = EXCLUDED.value_numeric, unit = EXCLUDED.unit, tested_by = EXCLUDED.tested_by, tested_at = EXCLUDED.tested_at, updated_at = EXCLUDED.updated_at;

WITH rating_values (sample_code, metric_key, rating_value, feedback_text) AS (
  VALUES
    ('PB-A-01', 'feel_rating', 8.5, 'Balanced feel with a consistent rebound.'), ('PB-A-01', 'sound_rating', 8.0, 'Crisp impact sound.'),
    ('PB-A-02', 'feel_rating', 8.7, 'Good control and firmness.'), ('PB-A-02', 'sound_rating', 8.2, 'Consistent acoustic response.'),
    ('PB-A-03', 'feel_rating', 8.4, 'Slightly softer but controlled.'), ('PB-A-03', 'sound_rating', 8.1, 'Clean impact sound.'),
    ('PB-A-04', 'feel_rating', 8.6, 'Strong overall player response.'), ('PB-A-04', 'sound_rating', 8.1, 'Stable across repeated hits.')
)
INSERT INTO sample_subjective_ratings (sample_id, metric_id, rating_value, feedback_text, rated_by, rated_at, updated_at)
SELECT s.id, md.id, v.rating_value, v.feedback_text, 'Panel A', '2026-07-11T16:00:00Z'::timestamptz, '2026-07-11T16:00:00Z'::timestamptz
FROM rating_values v
JOIN samples s ON s.sample_code = v.sample_code
JOIN metric_definitions md ON md.metric_key = v.metric_key
ON CONFLICT (sample_id, metric_id) DO UPDATE SET
  rating_value = EXCLUDED.rating_value, feedback_text = EXCLUDED.feedback_text, rated_by = EXCLUDED.rated_by, rated_at = EXCLUDED.rated_at, updated_at = EXCLUDED.updated_at;

INSERT INTO sample_observations (id, sample_id, observation_type, observation_text, observed_by, observed_at, updated_at)
VALUES
  ('46500001-0000-0000-0000-000000000001', '46000001-0000-0000-0000-000000000001', 'visual', 'No flashing or surface defects observed.', 'Lab Team', '2026-07-11T13:00:00Z', '2026-07-11T13:00:00Z'),
  ('46500001-0000-0000-0000-000000000002', '46000001-0000-0000-0000-000000000005', 'visual', 'Minor gate vestige noted; no impact on measurement setup.', 'Lab Team', '2026-07-11T13:30:00Z', '2026-07-11T13:30:00Z')
ON CONFLICT (id) DO UPDATE SET
  sample_id = EXCLUDED.sample_id, observation_type = EXCLUDED.observation_type, observation_text = EXCLUDED.observation_text,
  observed_by = EXCLUDED.observed_by, observed_at = EXCLUDED.observed_at, updated_at = EXCLUDED.updated_at;

WITH summary_values (id, metric_key, n_samples, mean_value, std_dev, min_value, max_value) AS (
  VALUES
    ('47000001-0000-0000-0000-000000000001'::uuid, 'weight', 4, 25.60000, 0.08165, 25.50000, 25.70000),
    ('47000001-0000-0000-0000-000000000002'::uuid, 'diameter', 4, 74.00000, 0.08165, 73.90000, 74.10000),
    ('47000001-0000-0000-0000-000000000003'::uuid, 'roundness', 4, 0.23750, 0.01708, 0.22000, 0.26000),
    ('47000001-0000-0000-0000-000000000004'::uuid, 'balance_deviation', 4, 0.39000, 0.01826, 0.37000, 0.41000),
    ('47000001-0000-0000-0000-000000000005'::uuid, 'bounce_height', 4, 27.51250, 0.08539, 27.40000, 27.60000),
    ('47000001-0000-0000-0000-000000000006'::uuid, 'hardness', 4, 49.50000, 0.57735, 49.00000, 50.00000),
    ('47000001-0000-0000-0000-000000000007'::uuid, 'compression', 4, 1.71500, 0.01291, 1.70000, 1.73000),
    ('47000001-0000-0000-0000-000000000008'::uuid, 'air_cannon_cycles_to_failure', 4, 2205.00000, 27.38613, 2180.00000, 2240.00000),
    ('47000001-0000-0000-0000-000000000009'::uuid, 'crack_initiation_cycles', 4, 1997.50000, 29.86079, 1960.00000, 2030.00000),
    ('47000001-0000-0000-0000-000000000010'::uuid, 'deformation_measurement', 4, 0.83250, 0.02986, 0.80000, 0.87000)
)
INSERT INTO run_metric_summaries (id, production_run_id, metric_id, n_samples, mean_value, std_dev, min_value, max_value, unit, source_table, generated_at)
SELECT v.id, '45000001-0000-0000-0000-000000000001', md.id, v.n_samples, v.mean_value, v.std_dev, v.min_value, v.max_value, md.default_unit, 'sample_test_results', '2026-07-11T17:00:00Z'::timestamptz
FROM summary_values v
JOIN metric_definitions md ON md.metric_key = v.metric_key
ON CONFLICT (id) DO UPDATE SET
  metric_id = EXCLUDED.metric_id, n_samples = EXCLUDED.n_samples, mean_value = EXCLUDED.mean_value, std_dev = EXCLUDED.std_dev,
  min_value = EXCLUDED.min_value, max_value = EXCLUDED.max_value, unit = EXCLUDED.unit, generated_at = EXCLUDED.generated_at;

WITH score_values (id, benchmark_code, overall_similarity_score, predictability_index, production_readiness_score, traffic_light, key_risks, recommendations, is_best_match) AS (
  VALUES
    ('48000001-0000-0000-0000-000000000001'::uuid, 'X40', 92.4, 90.8, 94.0, 'green'::traffic_light_status, '["Monitor hardness as production scales."]'::jsonb, '["Proceed with a larger pilot run.", "Confirm durability results after extended cycling."]'::jsonb, true),
    ('48000001-0000-0000-0000-000000000002'::uuid, 'LIFETIME', 87.1, 85.6, 94.0, 'yellow'::traffic_light_status, '["Bounce height trends above the Lifetime target."]'::jsonb, '["Use the X-40 benchmark for the next formulation iteration."]'::jsonb, false)
)
INSERT INTO score_reports (id, production_run_id, benchmark_profile_id, algorithm_version_id, overall_similarity_score, predictability_index, production_readiness_score, required_metric_completion_score, traffic_light, key_risks, recommendations, is_best_match, generated_at)
SELECT v.id, '45000001-0000-0000-0000-000000000001', bp.id, av.id, v.overall_similarity_score, v.predictability_index, v.production_readiness_score, 100, v.traffic_light, v.key_risks, v.recommendations, v.is_best_match, '2026-07-11T17:30:00Z'::timestamptz
FROM score_values v
JOIN benchmark_profiles bp ON bp.benchmark_code = v.benchmark_code
JOIN algorithm_versions av ON av.algorithm_code = 'PERFORMANCE_DISTANCE' AND av.version = '1.0'
ON CONFLICT (id) DO UPDATE SET
  benchmark_profile_id = EXCLUDED.benchmark_profile_id, algorithm_version_id = EXCLUDED.algorithm_version_id,
  overall_similarity_score = EXCLUDED.overall_similarity_score, predictability_index = EXCLUDED.predictability_index,
  production_readiness_score = EXCLUDED.production_readiness_score, required_metric_completion_score = EXCLUDED.required_metric_completion_score,
  traffic_light = EXCLUDED.traffic_light, key_risks = EXCLUDED.key_risks, recommendations = EXCLUDED.recommendations, is_best_match = EXCLUDED.is_best_match, generated_at = EXCLUDED.generated_at;

WITH metric_scores (id, metric_key, run_summary_id, run_mean_value, benchmark_target_mean, min_acceptable, max_acceptable, weight, metric_score, traffic_light, risk_level, risk_note) AS (
  VALUES
    ('49000001-0000-0000-0000-000000000001'::uuid, 'weight', '47000001-0000-0000-0000-000000000001'::uuid, 25.60000, 25.50000, 24.00000, 27.50000, 0.09, 98.5, 'green'::traffic_light_status, 'low', NULL),
    ('49000001-0000-0000-0000-000000000002'::uuid, 'diameter', '47000001-0000-0000-0000-000000000002'::uuid, 74.00000, 74.00000, 73.00000, 75.00000, 0.10, 100.0, 'green'::traffic_light_status, 'low', NULL),
    ('49000001-0000-0000-0000-000000000003'::uuid, 'roundness', '47000001-0000-0000-0000-000000000003'::uuid, 0.23750, 0.25000, 0.00000, 0.50000, 0.09, 97.5, 'green'::traffic_light_status, 'low', NULL),
    ('49000001-0000-0000-0000-000000000004'::uuid, 'bounce_height', '47000001-0000-0000-0000-000000000005'::uuid, 27.51250, 27.56000, 25.98000, 29.13000, 0.13, 97.0, 'green'::traffic_light_status, 'low', NULL),
    ('49000001-0000-0000-0000-000000000005'::uuid, 'hardness', '47000001-0000-0000-0000-000000000006'::uuid, 49.50000, 50.00000, 46.00000, 54.00000, 0.11, 95.0, 'yellow'::traffic_light_status, 'medium', 'Track hardness consistency in the next pilot run.'),
    ('49000001-0000-0000-0000-000000000006'::uuid, 'compression', '47000001-0000-0000-0000-000000000007'::uuid, 1.71500, 1.73000, 1.57000, 1.89000, 0.09, 96.0, 'green'::traffic_light_status, 'low', NULL),
    ('49000001-0000-0000-0000-000000000007'::uuid, 'air_cannon_cycles_to_failure', '47000001-0000-0000-0000-000000000008'::uuid, 2205.00000, 2200.00000, 1600.00000, 3200.00000, 0.12, 99.5, 'green'::traffic_light_status, 'low', NULL),
    ('49000001-0000-0000-0000-000000000008'::uuid, 'crack_initiation_cycles', '47000001-0000-0000-0000-000000000009'::uuid, 1997.50000, 2000.00000, 1400.00000, 2800.00000, 0.10, 99.8, 'green'::traffic_light_status, 'low', NULL),
    ('49000001-0000-0000-0000-000000000009'::uuid, 'deformation_measurement', '47000001-0000-0000-0000-000000000010'::uuid, 0.83250, 0.90000, 0.00000, 1.80000, 0.09, 96.3, 'green'::traffic_light_status, 'low', NULL)
)
INSERT INTO score_report_metrics (id, score_report_id, metric_id, run_metric_summary_id, run_mean_value, benchmark_target_mean, min_acceptable, max_acceptable, weight, metric_score, weighted_contribution, traffic_light, risk_level, risk_note)
SELECT v.id, '48000001-0000-0000-0000-000000000001', md.id, v.run_summary_id, v.run_mean_value, v.benchmark_target_mean, v.min_acceptable, v.max_acceptable, v.weight, v.metric_score, v.weight * v.metric_score, v.traffic_light, v.risk_level, v.risk_note
FROM metric_scores v
JOIN metric_definitions md ON md.metric_key = v.metric_key
ON CONFLICT (id) DO UPDATE SET
  metric_id = EXCLUDED.metric_id, run_metric_summary_id = EXCLUDED.run_metric_summary_id, run_mean_value = EXCLUDED.run_mean_value,
  benchmark_target_mean = EXCLUDED.benchmark_target_mean, min_acceptable = EXCLUDED.min_acceptable, max_acceptable = EXCLUDED.max_acceptable,
  weight = EXCLUDED.weight, metric_score = EXCLUDED.metric_score, weighted_contribution = EXCLUDED.weighted_contribution,
  traffic_light = EXCLUDED.traffic_light, risk_level = EXCLUDED.risk_level, risk_note = EXCLUDED.risk_note;

INSERT INTO generated_reports (id, production_run_id, primary_score_report_id, report_name, report_type, status, report_snapshot, generated_by, generated_at)
VALUES (
  '50000001-0000-0000-0000-000000000001',
  '45000001-0000-0000-0000-000000000001',
  '48000001-0000-0000-0000-000000000001',
  'RUN-260701-A Score Report',
  'formulation_score_report',
  'generated',
  $$
  {
    "benchmarkComparison": [
      {"benchmarkCode": "X40", "benchmarkName": "Franklin X-40", "predictabilityIndex": 90.8, "productionReadinessScore": 94.0, "similarityScore": 92.4, "status": "green"},
      {"benchmarkCode": "LIFETIME", "benchmarkName": "Lifetime Pickleball", "predictabilityIndex": 85.6, "productionReadinessScore": 94.0, "similarityScore": 87.1, "status": "yellow"}
    ],
    "executiveSummary": {"bestMatch": "Franklin X-40", "formulation": "PB-2607-A V1", "franklinX40Similarity": 92.4, "lifetimeSimilarity": 87.1, "mainRisk": "Monitor hardness as production scales.", "predictabilityIndex": 90.8, "productionReadiness": 94.0, "productionRun": "RUN-260701-A", "trafficLight": "green"},
    "formulationRecipe": [
      {"materialCode": "PP7033N", "material": "PP7033N", "supplier": "Supplier A", "lot": "PP-2026-771A", "percent": 76.0, "basis": "weight_percent"},
      {"materialCode": "VISTAMAXX_6202", "material": "Vistamaxx 6202", "supplier": "Supplier A", "lot": "VM-2026-118B", "percent": 16.0, "basis": "weight_percent"},
      {"materialCode": "ADDITIVE_A", "material": "Additive A", "supplier": "Supplier B", "lot": "ADDA-2026-034", "percent": 4.0, "basis": "weight_percent"}
    ],
    "historicalComparison": [],
    "keyRisks": ["Monitor hardness as production scales."],
    "labTestResults": [
      {"resultType": "sample_result", "sampleCode": "PB-A-01", "metricName": "Bounce Height", "category": "performance", "value": 27.4, "unit": "in", "conditionName": null},
      {"resultType": "sample_result", "sampleCode": "PB-A-02", "metricName": "Air Cannon Cycles to Failure", "category": "durability", "value": 2240, "unit": "cycles", "conditionName": null},
      {"resultType": "environmental_result", "sampleCode": "PB-A-03", "metricName": "Hot Temperature Performance", "category": "environmental", "value": 8.5, "unit": "score", "conditionName": "Hot"}
    ],
    "manufacturingParameters": {"machine": "Machine-01", "mold": "MOLD-A", "injectionPressure": "920 psi", "meltTemperature": "218 C", "coolingTime": "18 sec", "cycleTime": "42 sec", "cureHours": 72},
    "metricBreakdown": [
      {"metricName": "Diameter", "metricKey": "diameter", "category": "physical", "runMeanValue": 74.0, "benchmarkTargetMean": 74.0, "minAcceptable": 73.0, "maxAcceptable": 75.0, "weight": 0.10, "metricScore": 100.0, "trafficLight": "green", "riskLevel": "low", "riskNote": null, "range": "73 - 75", "risk": "low"},
      {"metricName": "Bounce Height", "metricKey": "bounce_height", "category": "performance", "runMeanValue": 27.5125, "benchmarkTargetMean": 27.56, "minAcceptable": 25.98, "maxAcceptable": 29.13, "weight": 0.13, "metricScore": 97.0, "trafficLight": "green", "riskLevel": "low", "riskNote": null, "range": "25.98 - 29.13", "risk": "low"},
      {"metricName": "Hardness", "metricKey": "hardness", "category": "performance", "runMeanValue": 49.5, "benchmarkTargetMean": 50.0, "minAcceptable": 46.0, "maxAcceptable": 54.0, "weight": 0.11, "metricScore": 95.0, "trafficLight": "yellow", "riskLevel": "medium", "riskNote": "Track hardness consistency in the next pilot run.", "range": "46 - 54", "risk": "medium"}
    ],
    "recommendations": ["Proceed with a larger pilot run.", "Confirm durability results after extended cycling."],
    "recommendationsPlaceholder": "Recommended formulation adjustments will be generated after report review.",
    "scoreReports": [],
    "trendAnalysis": []
  }
  $$::jsonb,
  '40000001-0000-0000-0000-000000000001',
  '2026-07-11T18:00:00Z'::timestamptz
)
ON CONFLICT (id) DO UPDATE SET
  production_run_id = EXCLUDED.production_run_id, primary_score_report_id = EXCLUDED.primary_score_report_id,
  report_name = EXCLUDED.report_name, report_type = EXCLUDED.report_type, status = EXCLUDED.status,
  report_snapshot = EXCLUDED.report_snapshot, generated_by = EXCLUDED.generated_by, generated_at = EXCLUDED.generated_at;
