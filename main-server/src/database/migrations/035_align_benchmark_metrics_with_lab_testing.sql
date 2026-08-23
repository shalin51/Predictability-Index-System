-- Benchmark targets must reference the same metric records used by Lab Testing.
-- Drop Test remains available in Lab Testing, but is not a benchmark property.

DELETE FROM benchmark_metric_targets bmt
USING metric_definitions md
WHERE bmt.metric_id = md.id
  AND md.metric_key IN ('drop_test', 'drop_test_legacy');

-- Where an old benchmark-specific metric and its Lab Testing equivalent both
-- exist on a profile, retain the benchmark-specific target values.
DELETE FROM benchmark_metric_targets canonical
USING benchmark_metric_targets legacy
JOIN metric_definitions legacy_metric ON legacy_metric.id = legacy.metric_id
JOIN metric_definitions canonical_metric ON true
WHERE canonical.benchmark_profile_id = legacy.benchmark_profile_id
  AND canonical_metric.id = canonical.metric_id
  AND canonical_metric.metric_key = CASE legacy_metric.metric_key
    WHEN 'compression_force_025_in' THEN 'compression'
    WHEN 'stretch_force_025_in' THEN 'stretch'
    WHEN 'full_stretch_max_force' THEN 'full_stretch_max'
  END;

UPDATE benchmark_metric_targets bmt
SET metric_id = canonical.id,
    metric_name = canonical.metric_key,
    metric_category = canonical.category::text,
    unit = canonical.default_unit,
    updated_at = now()
FROM metric_definitions legacy
JOIN metric_definitions canonical ON canonical.metric_key = CASE legacy.metric_key
  WHEN 'compression_force_025_in' THEN 'compression'
  WHEN 'stretch_force_025_in' THEN 'stretch'
  WHEN 'full_stretch_max_force' THEN 'full_stretch_max'
END
WHERE bmt.metric_id = legacy.id;

DELETE FROM benchmark_metric_targets bmt
USING metric_definitions md
WHERE bmt.metric_id = md.id
  AND md.metric_key NOT IN (
    'weight', 'compression', 'stretch', 'full_stretch_max',
    'hardness', 'wall_thickness', 'diameter'
  );

UPDATE benchmark_metric_targets bmt
SET metric_name = md.metric_key,
    metric_category = md.category::text,
    unit = md.default_unit,
    updated_at = now()
FROM metric_definitions md
WHERE bmt.metric_id = md.id;
