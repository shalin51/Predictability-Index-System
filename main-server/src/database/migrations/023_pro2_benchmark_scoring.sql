-- Migration 023: Pro2 benchmark weighting and one-sided scoring constraints

ALTER TABLE benchmark_metric_targets
  ADD COLUMN IF NOT EXISTS comparison_mode VARCHAR(30) NOT NULL DEFAULT 'target_range';

ALTER TABLE score_report_metrics
  ADD COLUMN IF NOT EXISTS comparison_mode VARCHAR(30) NOT NULL DEFAULT 'target_range';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'benchmark_metric_targets_comparison_mode_check') THEN
    ALTER TABLE benchmark_metric_targets
      ADD CONSTRAINT benchmark_metric_targets_comparison_mode_check
      CHECK (comparison_mode IN ('target_range', 'max_cap', 'min_floor'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'score_report_metrics_comparison_mode_check') THEN
    ALTER TABLE score_report_metrics
      ADD CONSTRAINT score_report_metrics_comparison_mode_check
      CHECK (comparison_mode IN ('target_range', 'max_cap', 'min_floor'));
  END IF;
END $$;

INSERT INTO metric_definitions
  (metric_key, display_name, category, default_unit, data_type, benchmark_comparable,
   required_for_scoring, higher_is_better, status, sort_order)
VALUES
  ('compression_force_025_in', 'Compression Force @ 0.25 in', 'performance', 'lbf', 'numeric', true, false, NULL, 'active', 81),
  ('stretch_force_025_in', 'Stretch Force @ 0.25 in', 'performance', 'lbf', 'numeric', true, false, NULL, 'active', 82),
  ('full_stretch_max_force', 'Full Stretch Maximum Force', 'performance', 'lbf', 'numeric', true, false, NULL, 'active', 83),
  ('drop_test_legacy', 'Bounce Height (Drop Test)', 'performance', 'in', 'numeric', true, false, false, 'active', 84)
ON CONFLICT (metric_key) DO NOTHING;

INSERT INTO benchmark_profiles
  (id, name, description, ball_brand, ball_model, is_active, benchmark_code,
   benchmark_name, profile_version, status, notes)
SELECT
  'a0000001-0000-0000-0000-000000000003',
  'Pro2 Pickleball',
  'Pro2 weighted benchmark. Activate after all pending reference targets and acceptable ranges are supplied.',
  'Pro2',
  'Pro2',
  false,
  'PRO2',
  'Pro2',
  1,
  'inactive',
  'Bounce and hardness are strict maximum caps. Stretch and full stretch split the combined 10% weight equally.'
WHERE NOT EXISTS (SELECT 1 FROM benchmark_profiles WHERE benchmark_code = 'PRO2');

WITH pro2 AS (
  SELECT id FROM benchmark_profiles WHERE benchmark_code = 'PRO2' ORDER BY profile_version DESC LIMIT 1
), rules(metric_key, target_mean, min_acceptable, max_acceptable, comparison_mode, weight, criticality, notes) AS (
  VALUES
    ('drop_test_legacy',          35.670::numeric, NULL::numeric, 35.670::numeric, 'max_cap',      0.30::numeric, 'critical', 'Pro2 maximum bounce height from supplied comparison data.'),
    ('weight',                    NULL::numeric,   NULL::numeric, NULL::numeric,   'target_range', 0.15::numeric, 'high',     'Reference target and acceptable range pending.'),
    ('hardness',                  55.310::numeric, NULL::numeric, 55.310::numeric, 'max_cap',      0.20::numeric, 'critical', 'Pro2 maximum hardness from supplied comparison data.'),
    ('compression_force_025_in', 41.700::numeric, NULL::numeric, NULL::numeric,   'target_range', 0.15::numeric, 'high',     'Pro2 mean supplied; acceptable range pending.'),
    ('stretch_force_025_in',      NULL::numeric,   NULL::numeric, NULL::numeric,   'target_range', 0.05::numeric, 'high',     'Half of the combined 10% stretch weight; reference range pending.'),
    ('full_stretch_max_force',    NULL::numeric,   NULL::numeric, NULL::numeric,   'target_range', 0.05::numeric, 'high',     'Half of the combined 10% stretch weight; reference range pending.'),
    ('wall_thickness',            NULL::numeric,   NULL::numeric, NULL::numeric,   'target_range', 0.10::numeric, 'high',     'Reference target and acceptable range pending.')
)
INSERT INTO benchmark_metric_targets
  (benchmark_id, benchmark_profile_id, metric_name, metric_category, metric_id,
   target_value, target_mean, min_acceptable, max_acceptable, weight, criticality,
   unit, notes, required_for_pass, comparison_mode)
SELECT
  pro2.id, pro2.id, md.metric_key, md.category::text, md.id,
  rules.target_mean, rules.target_mean, rules.min_acceptable, rules.max_acceptable,
  rules.weight, rules.criticality, md.default_unit, rules.notes, true, rules.comparison_mode
FROM rules
CROSS JOIN pro2
JOIN metric_definitions md ON md.metric_key = rules.metric_key
ON CONFLICT (benchmark_id, metric_name) DO NOTHING;
