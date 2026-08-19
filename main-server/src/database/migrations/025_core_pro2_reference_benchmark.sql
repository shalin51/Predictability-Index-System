-- Migration 025: Align the Core Pro 2 reference benchmark with the supplied
-- weighted similarity analysis. The source supplies target averages and
-- weights, but not acceptable ranges, so this benchmark remains inactive for
-- production pass/fail scoring.

UPDATE benchmark_profiles
SET
  name = 'Core Pro 2',
  benchmark_name = 'Core Pro 2',
  ball_brand = 'Core',
  ball_model = 'Pro 2',
  description = 'Core Pro 2 weighted reference benchmark. Use for weighted similarity analysis; acceptable production-scoring ranges have not been supplied.',
  notes = 'Weights: Drop Test 30%, Weight 15%, Hardness 20%, Compression 15%, Stretch 5%, Full Stretch 5%, Wall Thickness 10%. Remains inactive until acceptable ranges and source units are confirmed.',
  is_active = false,
  status = 'inactive',
  updated_at = now()
WHERE benchmark_code = 'PRO2';

WITH targets(metric_key, target_mean, weight, notes) AS (
  VALUES
    ('drop_test_legacy', 901.00::numeric, 0.30::numeric, 'Core Pro 2 average from the weighted similarity analysis.'),
    ('weight', 25.87::numeric, 0.15::numeric, 'Core Pro 2 average from the weighted similarity analysis.'),
    ('hardness', 57.67::numeric, 0.20::numeric, 'Core Pro 2 average from the weighted similarity analysis.'),
    ('compression_force_025_in', 35.57::numeric, 0.15::numeric, 'Core Pro 2 average from the weighted similarity analysis.'),
    ('stretch_force_025_in', 191.10::numeric, 0.05::numeric, 'Core Pro 2 average from the weighted similarity analysis.'),
    ('full_stretch_max_force', 226.20::numeric, 0.05::numeric, 'Core Pro 2 average from the weighted similarity analysis.'),
    ('wall_thickness', 1.97::numeric, 0.10::numeric, 'Core Pro 2 average from the weighted similarity analysis.')
)
UPDATE benchmark_metric_targets bmt
SET
  target_value = targets.target_mean,
  target_mean = targets.target_mean,
  min_acceptable = NULL,
  max_acceptable = NULL,
  weight = targets.weight,
  notes = targets.notes,
  required_for_pass = false,
  comparison_mode = 'target_range'
FROM benchmark_profiles bp
JOIN metric_definitions md ON true
JOIN targets ON targets.metric_key = md.metric_key
WHERE bp.benchmark_code = 'PRO2'
  AND bmt.benchmark_profile_id = bp.id
  AND bmt.metric_id = md.id;
