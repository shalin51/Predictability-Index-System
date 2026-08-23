-- Development reset: benchmarks are no longer retained as a separate property set.
-- Lab Testing metric definitions remain the shared property source.

DELETE FROM generated_reports;
DELETE FROM score_reports;
DELETE FROM benchmark_metric_targets;
DELETE FROM benchmark_profiles;
