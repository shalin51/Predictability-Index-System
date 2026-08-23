-- Keep the property catalog and all metric references limited to Lab Testing.

DELETE FROM score_report_metrics
WHERE metric_id IN (
  SELECT id FROM metric_definitions
  WHERE metric_key NOT IN (
    'weight', 'compression', 'stretch', 'full_stretch_max',
    'hardness', 'wall_thickness', 'diameter', 'drop_test'
  )
);

DELETE FROM benchmark_metric_targets
WHERE metric_id IN (
  SELECT id FROM metric_definitions
  WHERE metric_key NOT IN (
    'weight', 'compression', 'stretch', 'full_stretch_max',
    'hardness', 'wall_thickness', 'diameter', 'drop_test'
  )
);

DELETE FROM comparison_analysis_metrics
WHERE metric_id IN (
  SELECT id FROM metric_definitions
  WHERE metric_key NOT IN (
    'weight', 'compression', 'stretch', 'full_stretch_max',
    'hardness', 'wall_thickness', 'diameter', 'drop_test'
  )
);

DELETE FROM run_metric_summaries
WHERE metric_id IN (
  SELECT id FROM metric_definitions
  WHERE metric_key NOT IN (
    'weight', 'compression', 'stretch', 'full_stretch_max',
    'hardness', 'wall_thickness', 'diameter', 'drop_test'
  )
);

DELETE FROM sample_subjective_ratings
WHERE metric_id IN (
  SELECT id FROM metric_definitions
  WHERE metric_key NOT IN (
    'weight', 'compression', 'stretch', 'full_stretch_max',
    'hardness', 'wall_thickness', 'diameter', 'drop_test'
  )
);

DELETE FROM environmental_test_results
WHERE metric_id IN (
  SELECT id FROM metric_definitions
  WHERE metric_key NOT IN (
    'weight', 'compression', 'stretch', 'full_stretch_max',
    'hardness', 'wall_thickness', 'diameter', 'drop_test'
  )
) OR test_method_id IN (
  SELECT tm.id FROM test_method_definitions tm
  JOIN metric_definitions md ON md.id = tm.metric_id
  WHERE md.metric_key NOT IN (
    'weight', 'compression', 'stretch', 'full_stretch_max',
    'hardness', 'wall_thickness', 'diameter', 'drop_test'
  )
);

DELETE FROM sample_test_results
WHERE metric_id IN (
  SELECT id FROM metric_definitions
  WHERE metric_key NOT IN (
    'weight', 'compression', 'stretch', 'full_stretch_max',
    'hardness', 'wall_thickness', 'diameter', 'drop_test'
  )
) OR test_method_id IN (
  SELECT tm.id FROM test_method_definitions tm
  JOIN metric_definitions md ON md.id = tm.metric_id
  WHERE md.metric_key NOT IN (
    'weight', 'compression', 'stretch', 'full_stretch_max',
    'hardness', 'wall_thickness', 'diameter', 'drop_test'
  )
);

DELETE FROM test_method_definitions
WHERE metric_id IN (
  SELECT id FROM metric_definitions
  WHERE metric_key NOT IN (
    'weight', 'compression', 'stretch', 'full_stretch_max',
    'hardness', 'wall_thickness', 'diameter', 'drop_test'
  )
);

DELETE FROM metric_definitions
WHERE metric_key NOT IN (
  'weight', 'compression', 'stretch', 'full_stretch_max',
  'hardness', 'wall_thickness', 'diameter', 'drop_test'
);
