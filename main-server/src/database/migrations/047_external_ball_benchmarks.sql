-- Add source provenance and external reference-ball performance metrics.

ALTER TABLE benchmark_profiles
  ADD COLUMN IF NOT EXISTS test_date DATE,
  ADD COLUMN IF NOT EXISTS report_number VARCHAR(100);

INSERT INTO metric_definitions
  (metric_key, display_name, category, default_unit, data_type, benchmark_comparable,
   required_for_scoring, higher_is_better, status, sort_order)
VALUES
  ('cor_78in', 'COR (78 in Bounce)', 'performance', 'ratio', 'numeric', true, false, NULL, 'active', 90),
  ('cor_50mph', 'COR (50 MPH)', 'performance', 'ratio', 'numeric', true, false, NULL, 'active', 100),
  ('rebound_speed_50mph', 'Rebound Speed (50 MPH)', 'performance', 'mph', 'numeric', true, false, NULL, 'active', 110)
ON CONFLICT (metric_key) DO UPDATE
SET display_name = EXCLUDED.display_name,
    category = EXCLUDED.category,
    default_unit = EXCLUDED.default_unit,
    data_type = EXCLUDED.data_type,
    benchmark_comparable = EXCLUDED.benchmark_comparable,
    required_for_scoring = EXCLUDED.required_for_scoring,
    higher_is_better = EXCLUDED.higher_is_better,
    status = EXCLUDED.status,
    sort_order = EXCLUDED.sort_order,
    updated_at = now();

-- A new source report creates a new profile version; prior versions remain
-- available for history but are not included in current comparisons.
UPDATE benchmark_profiles
SET status = 'inactive', is_active = false, updated_at = now()
WHERE benchmark_code IN ('X40', 'LIFETIME')
  AND profile_version < 2;

INSERT INTO benchmark_profiles
  (name, benchmark_code, benchmark_name, profile_version, description, ball_brand,
   ball_model, test_date, report_number, is_active, status, notes)
VALUES
  ('Selkirk S1 - PH00018390', 'S1', 'Selkirk S1', 1,
   'External reference-ball laboratory averages.', 'Selkirk', 'S1', '2026-02-17', 'PH00018390', true, 'active',
   'Weight converted from 0.929 oz to 26.336707 g.'),
  ('Franklin X-40 - PH00018140', 'X40', 'Franklin X-40', 2,
   'External reference-ball laboratory averages.', 'Franklin', 'X-40', '2026-01-22', 'PH00018140', true, 'active',
   'Weight converted from 0.912 oz to 25.854765 g.'),
  ('Lifetime LT48 - PH00018140', 'LIFETIME', 'Lifetime LT48', 2,
   'External reference-ball laboratory averages.', 'Lifetime', 'LT48', '2026-01-22', 'PH00018140', true, 'active',
   'Weight converted from 0.913 oz to 25.883115 g.'),
  ('CORE Impact - PH00018140', 'IMPACT', 'CORE Impact', 1,
   'External reference-ball laboratory averages.', 'CORE', 'Impact', '2026-01-22', 'PH00018140', true, 'active',
   'Weight converted from 0.921 oz to 26.109911 g. COR (50 MPH) and rebound speed were not supplied.')
ON CONFLICT (benchmark_code, profile_version) DO UPDATE
SET name = EXCLUDED.name,
    benchmark_name = EXCLUDED.benchmark_name,
    description = EXCLUDED.description,
    ball_brand = EXCLUDED.ball_brand,
    ball_model = EXCLUDED.ball_model,
    test_date = EXCLUDED.test_date,
    report_number = EXCLUDED.report_number,
    is_active = EXCLUDED.is_active,
    status = EXCLUDED.status,
    notes = EXCLUDED.notes,
    updated_at = now();

WITH supplied(benchmark_code, profile_version, metric_key, target_mean) AS (
  VALUES
    ('S1', 1, 'weight', 26.336707::numeric),
    ('S1', 1, 'drop_test', 32.960::numeric),
    ('S1', 1, 'hardness', 56.120::numeric),
    ('S1', 1, 'compression', 39.880::numeric),
    ('S1', 1, 'cor_78in', 0.650::numeric),
    ('S1', 1, 'cor_50mph', 0.309::numeric),
    ('S1', 1, 'rebound_speed_50mph', 14.200::numeric),
    ('X40', 2, 'weight', 25.854765::numeric),
    ('X40', 2, 'drop_test', 32.170::numeric),
    ('X40', 2, 'hardness', 49.510::numeric),
    ('X40', 2, 'compression', 32.510::numeric),
    ('X40', 2, 'cor_78in', 0.643::numeric),
    ('X40', 2, 'cor_50mph', 0.310::numeric),
    ('X40', 2, 'rebound_speed_50mph', 15.500::numeric),
    ('LIFETIME', 2, 'weight', 25.883115::numeric),
    ('LIFETIME', 2, 'drop_test', 34.320::numeric),
    ('LIFETIME', 2, 'hardness', 52.100::numeric),
    ('LIFETIME', 2, 'compression', 42.360::numeric),
    ('LIFETIME', 2, 'cor_78in', 0.663::numeric),
    ('LIFETIME', 2, 'cor_50mph', 0.365::numeric),
    ('LIFETIME', 2, 'rebound_speed_50mph', 18.300::numeric),
    ('IMPACT', 1, 'weight', 26.109911::numeric),
    ('IMPACT', 1, 'drop_test', 32.060::numeric),
    ('IMPACT', 1, 'hardness', 48.860::numeric),
    ('IMPACT', 1, 'compression', 34.200::numeric),
    ('IMPACT', 1, 'cor_78in', 0.641::numeric)
)
INSERT INTO benchmark_metric_targets
  (benchmark_id, benchmark_profile_id, metric_name, metric_category, metric_id,
   target_value, target_mean, weight, criticality, unit, notes, required_for_pass,
   comparison_mode)
SELECT bp.id, bp.id, md.metric_key, md.category::text, md.id,
       supplied.target_mean, supplied.target_mean, 0, 'medium', md.default_unit,
       'Average supplied by external laboratory report ' || bp.report_number || '.',
       false, 'target_range'
FROM supplied
JOIN benchmark_profiles bp
  ON bp.benchmark_code = supplied.benchmark_code
 AND bp.profile_version = supplied.profile_version
JOIN metric_definitions md ON md.metric_key = supplied.metric_key
ON CONFLICT (benchmark_id, metric_name) DO UPDATE
SET benchmark_profile_id = EXCLUDED.benchmark_profile_id,
    metric_category = EXCLUDED.metric_category,
    metric_id = EXCLUDED.metric_id,
    target_value = EXCLUDED.target_value,
    target_mean = EXCLUDED.target_mean,
    unit = EXCLUDED.unit,
    notes = EXCLUDED.notes,
    required_for_pass = EXCLUDED.required_for_pass,
    comparison_mode = EXCLUDED.comparison_mode,
    updated_at = now();

INSERT INTO scoring_profile_weights (scoring_profile_id, metric_id, weight)
SELECT sp.id, md.id, 0
FROM scoring_profiles sp
JOIN metric_definitions md
  ON md.metric_key IN ('cor_78in', 'cor_50mph', 'rebound_speed_50mph')
ON CONFLICT (scoring_profile_id, metric_id) DO NOTHING;

CREATE OR REPLACE FUNCTION seed_scoring_profile_weights()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO scoring_profile_weights (scoring_profile_id, metric_id)
  SELECT NEW.id, id
  FROM metric_definitions
  WHERE status = 'active' AND benchmark_comparable = true
  ON CONFLICT (scoring_profile_id, metric_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
