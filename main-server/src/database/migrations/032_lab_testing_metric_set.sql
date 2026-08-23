-- Keep Lab Testing to the eight supported, uniquely identified test types.

INSERT INTO metric_definitions
  (metric_key, display_name, category, default_unit, data_type, benchmark_comparable,
   required_for_scoring, higher_is_better, status, sort_order)
VALUES
  ('weight', 'Weight', 'physical', 'g', 'numeric', true, true, NULL, 'active', 10),
  ('compression', 'Compression', 'physical', 'lbf', 'numeric', true, true, NULL, 'active', 20),
  ('stretch', 'Stretch', 'physical', 'lbf', 'numeric', true, true, NULL, 'active', 30),
  ('full_stretch_max', 'Full Stretch max', 'physical', 'lbf', 'numeric', true, true, NULL, 'active', 40),
  ('hardness', 'Hardness', 'physical', 'Shore D', 'numeric', true, true, NULL, 'active', 50),
  ('wall_thickness', 'Wall Thickness', 'physical', 'mm', 'numeric', true, true, NULL, 'active', 60),
  ('diameter', 'Diameter', 'physical', 'mm', 'numeric', true, true, NULL, 'active', 70),
  ('drop_test', 'Drop Test', 'physical', 'in', 'numeric', true, true, NULL, 'active', 80)
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_testing_metric_display_name_unique
  ON metric_definitions (lower(display_name))
  WHERE metric_key IN (
    'weight', 'compression', 'stretch', 'full_stretch_max',
    'hardness', 'wall_thickness', 'diameter', 'drop_test'
  );
